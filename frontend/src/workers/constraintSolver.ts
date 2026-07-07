/**
 * constraintSolver.ts
 * Per-node transfer functions: given incoming RPS, compute outgoing RPS,
 * utilisation, error rate, and queue depth for each node type.
 *
 * Also owns the mutable inter-tick state (queue depths, rolling errors)
 * via SolverState, which the worker resets on START/STOP.
 */

import { NodeType, NodeHealth } from '../types/topology'
import type {
  SimNode, ActiveScenario,
  BaseNodeConfig, ClientConfig, LoadBalancerConfig, CacheConfig, CDNConfig,
  QueueConfig, ApiGatewayConfig, ServerlessConfig, WorkerConfig as WorkerNodeConfig,
  PubSubConfig, StreamConfig, RateLimiterConfig, ObjectStoreConfig,
  ExternalServiceConfig, LLMGatewayConfig, VectorDBConfig, AgentOrchestratorConfig,
  DNSConfig, NoSQLStoreConfig, WAFConfig, GraphDBConfig,
  ObservabilityMeshConfig, ToolRegistryConfig, MemoryFabricConfig,
} from '../types/topology'

// ── Chaos modifier ────────────────────────────────────────────────────────────

export interface ChaosModifier {
  rpsMult:      number   // applied to incomingRps (1 = no change)
  failureRate:  number   // -1 = use node's own; 0–1 overrides
  utilFloor:    number   // -1 = no floor; 0–1 = minimum utilisation
  latencyAddMs: number   // extra ms added to node's base latency contribution
  hitRateOverride: number // -1 = use node's own; 0–1 overrides cache/CDN hit rate
}

const NO_CHAOS: ChaosModifier = { rpsMult: 1, failureRate: -1, utilFloor: -1, latencyAddMs: 0, hitRateOverride: -1 }

// Severity → multiplier / floor / latency tables
const SEV_RPS:     Record<string, number> = { mild: 0.7, moderate: 0.4, severe: 0.1 }
const SEV_FLOOR:   Record<string, number> = { mild: -1,  moderate: 0.7, severe: 1.0 }
const SEV_LATENCY: Record<string, number> = { mild: 20,  moderate: 50,  severe: 100 }

/** Aggregate all active chaos scenarios targeting this node (or its incoming edges) into a single modifier. */
export function buildChaosModifier(
  nodeId:          string,
  incomingEdgeIds: string[],
  workerChaos:     Map<string, ActiveScenario>,
  tick:            number = 0,
): ChaosModifier {
  let rpsMult      = 1
  let failureRate  = -1
  let utilFloor    = -1
  let latencyAddMs = 0
  let hitRateOverride = -1

  for (const scenario of workerChaos.values()) {
    const targetsNode = scenario.targetNodeIds.includes(nodeId)
    const targetsEdge = incomingEdgeIds.length > 0 &&
      scenario.targetEdgeIds.some(eid => incomingEdgeIds.includes(eid))
    if (!targetsNode && !targetsEdge) continue

    const id  = scenario.scenarioId
    const cfg = scenario.config as Record<string, unknown>
    const sev = (cfg.severity as string) ?? 'moderate'
    const mul = (cfg.multiplier as number) ?? 2
    const cap = (cfg.cap      as number) ?? 50

    // Edge-targeted latency scenarios — affect downstream node's latency
    if (targetsEdge) {
      if (id === 'NET_LATENCY') {
        latencyAddMs += (cfg.value as number) ?? 100
        continue
      }
      if (id === 'NET_BANDWIDTH') {
        rpsMult       = Math.min(rpsMult, cap / 100)
        latencyAddMs += 20
        continue
      }
    }

    if (!targetsNode) continue

    // Crash / failure scenarios — immediate kill
    if ([
      'INFRA_INSTANCE_CRASH', 'INFRA_DISK_FAILURE', 'INFRA_AZ_FAILURE', 'INFRA_DC_OUTAGE',
      'APP_OOM_CRASH', 'APP_DEADLOCK',
      'NET_LB_FAILURE', 'NET_TLS_CERT', 'NET_DNS_FAILURE', 'NET_NAT_FAILURE',
      'DEP_THIRD_PARTY', 'DEP_AUTH_OUTAGE', 'DEP_SERVICE_DISCOVERY',
      'DATA_DB_PRIMARY_CRASH', 'DATA_CACHE_SENTINEL_SPLIT',
    ].includes(id)) {
      rpsMult     = 0
      failureRate = 1.0
      continue
    }

    // Blackhole — silent drop, no error signal (traffic vanishes)
    if (id === 'NET_BLACKHOLE') {
      rpsMult = 0
      continue
    }

    // Degradation / severity-based
    if (['INFRA_INSTANCE_DEGRADATION', 'INFRA_CPU_THROTTLE', 'APP_MEMORY_LEAK'].includes(id)) {
      rpsMult      = Math.min(rpsMult, SEV_RPS[sev] ?? 0.4)
      utilFloor    = Math.max(utilFloor, SEV_FLOOR[sev] ?? -1)
      latencyAddMs += SEV_LATENCY[sev] ?? 50
      continue
    }

    // IOPS / bandwidth throttle — cap as % of normal
    if (['INFRA_IOPS_THROTTLE', 'NET_BANDWIDTH'].includes(id)) {
      rpsMult = Math.min(rpsMult, cap / 100)
      continue
    }

    // Corruption — partial failures with added latency
    if (['INFRA_DISK_CORRUPTION', 'DATA_CORRUPTION', 'DATA_CACHE_POISONING'].includes(id)) {
      rpsMult      = Math.min(rpsMult, 0.5)
      failureRate  = Math.max(failureRate, 0.4)
      latencyAddMs += 50
      continue
    }

    // Thread / pool exhaustion
    if (['APP_THREAD_EXHAUSTION', 'DATA_CONN_POOL'].includes(id)) {
      rpsMult     = 0
      failureRate = Math.max(failureRate, 0.9)
      utilFloor   = 1.0
      continue
    }

    // Traffic amplification
    if (['TRAFFIC_SPIKE', 'TRAFFIC_RETRY_STORM', 'TRAFFIC_BOT_FLOOD', 'TRAFFIC_THUNDERING_HERD'].includes(id)) {
      rpsMult = Math.max(rpsMult, mul)
      if (id === 'TRAFFIC_BOT_FLOOD') failureRate = Math.max(failureRate, 0.6)
      continue
    }

    // Queue backlog / replication lag
    if (['DEP_QUEUE_BACKLOG', 'DATA_CACHE_EVICTION_STORM'].includes(id)) {
      rpsMult     = Math.min(rpsMult, 0.1)
      utilFloor   = 1.0
      continue
    }

    // Data layer — moderate degradation
    if (['DATA_REPLICA_FAILURE', 'DATA_REPLICATION_LAG', 'DATA_CACHE_OOM'].includes(id)) {
      rpsMult     = Math.min(rpsMult, 0.4)
      failureRate = Math.max(failureRate, 0.2)
      continue
    }

    if (['DATA_SPLIT_BRAIN', 'DATA_CACHE_REPLICA_DESYNC', 'DATA_CACHE_CLUSTER_PARTITION'].includes(id)) {
      failureRate = Math.max(failureRate, 0.3)
      continue
    }

    if (['DATA_LOCK_CONTENTION', 'DATA_HOT_PARTITION', 'DATA_NOISY_NEIGHBOUR'].includes(id)) {
      rpsMult     = Math.min(rpsMult, 0.3)
      utilFloor   = Math.max(utilFloor, 0.9)
      continue
    }

    if (['APP_DEP_TIMEOUT'].includes(id)) {
      rpsMult      = Math.min(rpsMult, 0.5)
      failureRate  = Math.max(failureRate, 0.3)
      latencyAddMs += 50
      continue
    }

    if (id === 'NET_IDLE_TIMEOUT') {
      failureRate  = Math.max(failureRate, 0.1)
      latencyAddMs += (cfg.value as number) ?? 200
      continue
    }

    if (['NET_STICKY_SKEW', 'APP_LOG_OVERLOAD'].includes(id)) {
      utilFloor = 1.0
      continue
    }

    // GC pause — periodic stop-the-world freeze. cfg.value = pause interval (ms).
    // The node freezes for ~20% of each interval; latency spikes during the pause.
    if (id === 'APP_GC_PAUSE') {
      const intervalMs  = (cfg.value as number) ?? 500
      const periodTicks = Math.max(2, Math.round(intervalMs / 200))
      const pauseTicks  = Math.max(1, Math.ceil(periodTicks * 0.2))
      if (tick % periodTicks < pauseTicks) {
        rpsMult      = 0
        utilFloor    = 1.0
        latencyAddMs += intervalMs
      }
      continue
    }

    // Payload explosion — same request rate, but each request costs N× to
    // process, so utilisation and downstream strain amplify by the multiplier.
    if (id === 'TRAFFIC_PAYLOAD_EXPLOSION') {
      rpsMult      = Math.max(rpsMult, mul)
      latencyAddMs += 30
      continue
    }

    // Cache persistence failure — cache restarts cold: every request misses
    // and falls through to the backing store, with warm-up latency on top.
    if (id === 'DATA_CACHE_PERSISTENCE') {
      hitRateOverride = 0
      latencyAddMs    += 300
      continue
    }
  }

  return { rpsMult, failureRate, utilFloor, latencyAddMs, hitRateOverride }
}

// ── Output type ───────────────────────────────────────────────────────────────

export interface NodeFlow {
  outRps:         number   // requests/sec leaving this node
  utilisationPct: number
  errorRate:      number   // 0–1
  queueDepth:     number
}

// ── Inter-tick mutable state ──────────────────────────────────────────────────

export class SolverState {
  queueDepths   = new Map<string, number>()
  rollingErrors = new Map<string, number[]>()  // last 25 ticks (~5s)

  reset() {
    this.queueDepths.clear()
    this.rollingErrors.clear()
  }

  rollingError(nodeId: string, latest: number): number {
    const arr = this.rollingErrors.get(nodeId) ?? []
    arr.push(latest)
    if (arr.length > 25) arr.shift()
    this.rollingErrors.set(nodeId, arr)
    return arr.reduce((s, v) => s + v, 0) / arr.length
  }
}

// ── Health from utilisation ───────────────────────────────────────────────────

export function healthFrom(utilisationPct: number, errorRate: number): NodeHealth {
  if (errorRate >= 0.5)      return NodeHealth.Failed
  if (utilisationPct >= 90)  return NodeHealth.Bottleneck
  if (utilisationPct >= 60)  return NodeHealth.Stressed
  return NodeHealth.Healthy
}

// ── Per-node transfer functions ───────────────────────────────────────────────

export function computeNodeFlow(
  node:        SimNode,
  incomingRps: number,
  state:       SolverState,
  tickId:      number,
  tickSecs:    number,   // simulated seconds per tick (TICK_SECS * speed)
  chaos:       ChaosModifier = NO_CHAOS,
): NodeFlow {
  // Apply chaos RPS multiplier to incoming traffic
  const effectiveRps = incomingRps * chaos.rpsMult

  const failureRoll = Math.random()

  // Helper: apply chaos failure/util overrides to a computed flow
  const applyChaos = (flow: NodeFlow): NodeFlow => {
    const errorRate = chaos.failureRate >= 0 ? chaos.failureRate : flow.errorRate
    const outRps    = chaos.failureRate >= 0 ? flow.outRps * (1 - chaos.failureRate) : flow.outRps
    const util      = chaos.utilFloor   >= 0 ? Math.max(flow.utilisationPct, chaos.utilFloor * 100) : flow.utilisationPct
    return { ...flow, outRps, errorRate, utilisationPct: util }
  }

  switch (node.nodeType) {

    case NodeType.Client: {
      const cfg   = node.config as ClientConfig
      const burst = cfg.burst && (tickId % 30 < 5) ? 3 : 1
      // Chaos rpsMult amplifies client output (traffic spike / bot flood)
      return { outRps: cfg.rps * burst * chaos.rpsMult, utilisationPct: 0, errorRate: 0, queueDepth: 0 }
    }

    case NodeType.LoadBalancer: {
      const cfg    = node.config as LoadBalancerConfig
      const util   = effectiveRps / cfg.capacity
      const failed = failureRoll < cfg.failureRate
      return applyChaos({ outRps: failed ? 0 : effectiveRps, utilisationPct: util * 100, errorRate: failed ? 1 : 0, queueDepth: 0 })
    }

    case NodeType.ApiGateway: {
      const cfg     = node.config as ApiGatewayConfig
      const limited = cfg.rateLimit > 0 ? Math.min(effectiveRps, cfg.rateLimit) : effectiveRps
      const util    = effectiveRps / cfg.capacity
      const failed  = failureRoll < cfg.failureRate
      const errRate = (effectiveRps - limited) / Math.max(effectiveRps, 1)
      return applyChaos({ outRps: failed ? 0 : limited, utilisationPct: util * 100, errorRate: failed ? 1 : errRate, queueDepth: 0 })
    }

    case NodeType.ApiServer:
    case NodeType.Microservice: {
      const cfg   = node.config as BaseNodeConfig
      const util  = effectiveRps / cfg.capacity
      const failed = failureRoll < cfg.failureRate
      return applyChaos({
        outRps:         failed ? 0 : Math.min(effectiveRps, cfg.capacity),
        utilisationPct: util * 100,
        errorRate:      failed ? 1 : Math.max(0, util - 1),
        queueDepth:     0,
      })
    }

    case NodeType.Cache: {
      const cfg     = node.config as CacheConfig
      const hitRate = chaos.hitRateOverride >= 0 ? chaos.hitRateOverride : cfg.hitRate
      return applyChaos({ outRps: effectiveRps * (1 - hitRate), utilisationPct: (effectiveRps / cfg.capacity) * 100, errorRate: 0, queueDepth: 0 })
    }

    case NodeType.CDN: {
      const cfg     = node.config as CDNConfig
      const hitRate = chaos.hitRateOverride >= 0 ? chaos.hitRateOverride : cfg.hitRate
      return applyChaos({ outRps: effectiveRps * (1 - hitRate), utilisationPct: (effectiveRps / cfg.capacity) * 100, errorRate: 0, queueDepth: 0 })
    }

    case NodeType.Database: {
      const cfg    = node.config as BaseNodeConfig
      const util   = effectiveRps / cfg.capacity
      const failed = failureRoll < cfg.failureRate
      return applyChaos({
        outRps:         failed ? 0 : Math.min(effectiveRps, cfg.capacity),
        utilisationPct: util * 100,
        errorRate:      failed ? 1 : Math.max(0, util - 1),
        queueDepth:     0,
      })
    }

    case NodeType.Queue: {
      const cfg    = node.config as QueueConfig
      const prev   = state.queueDepths.get(node.id) ?? 0
      const added  = effectiveRps * tickSecs
      const drained = (1 / (cfg.delayMs / 1000 || 0.1)) * tickSecs
      const depth  = Math.max(0, prev + added - drained)
      const capped = cfg.maxDepth > 0 ? Math.min(depth, cfg.maxDepth) : depth
      state.queueDepths.set(node.id, capped)
      const util = cfg.maxDepth > 0 ? capped / cfg.maxDepth : Math.min(capped / 1000, 1)
      return applyChaos({ outRps: drained / tickSecs, utilisationPct: util * 100, errorRate: 0, queueDepth: Math.round(capped) })
    }

    case NodeType.Serverless: {
      const cfg        = node.config as ServerlessConfig
      const cold       = Math.random() < cfg.coldStartProbability
      const effMs      = cold ? cfg.coldStartMs : cfg.warmLatencyMs
      const throughput = (cfg.concurrencyLimit * 1000) / Math.max(effMs, 1)
      const util       = effectiveRps / throughput
      const failed     = failureRoll < cfg.failureRate
      return applyChaos({
        outRps:         failed ? 0 : Math.min(effectiveRps, throughput),
        utilisationPct: util * 100,
        errorRate:      failed ? 1 : Math.max(0, util - 1),
        queueDepth:     0,
      })
    }

    case NodeType.Worker: {
      const cfg    = node.config as WorkerNodeConfig
      const prev   = state.queueDepths.get(node.id) ?? 0
      const added  = effectiveRps * tickSecs
      const drained = cfg.throughput * tickSecs
      const depth  = Math.max(0, prev + added - drained)
      state.queueDepths.set(node.id, depth)
      const util   = effectiveRps / cfg.throughput
      const failed = failureRoll < cfg.failureRate
      return applyChaos({
        outRps:         failed ? 0 : Math.min(effectiveRps, cfg.throughput),
        utilisationPct: util * 100,
        errorRate:      failed ? 1 : 0,
        queueDepth:     Math.round(depth),
      })
    }

    case NodeType.PubSub: {
      const cfg    = node.config as PubSubConfig
      const prev   = state.queueDepths.get(node.id) ?? 0
      const added  = effectiveRps * tickSecs
      const drain  = (1 / (cfg.deliveryLatencyMs / 1000 || 0.01)) * tickSecs
      const depth  = Math.max(0, prev + added - drain)
      const capped = cfg.maxDepth > 0 ? Math.min(depth, cfg.maxDepth) : depth
      state.queueDepths.set(node.id, capped)
      const util   = cfg.maxDepth > 0 ? capped / cfg.maxDepth : Math.min(capped / 1000, 1)
      return applyChaos({
        outRps:         (drain / tickSecs) * cfg.subscriberCount,
        utilisationPct: util * 100,
        errorRate:      failureRoll < cfg.failureRate ? 1 : 0,
        queueDepth:     Math.round(capped),
      })
    }

    case NodeType.Stream: {
      const cfg    = node.config as StreamConfig
      const util   = effectiveRps / cfg.throughput
      const failed = failureRoll < cfg.failureRate
      return applyChaos({
        outRps:         failed ? 0 : Math.min(effectiveRps, cfg.throughput) * cfg.consumerGroups,
        utilisationPct: util * 100,
        errorRate:      failed ? 1 : 0,
        queueDepth:     0,
      })
    }

    case NodeType.RateLimiter: {
      const cfg     = node.config as RateLimiterConfig
      const allowed = Math.min(effectiveRps, cfg.rateLimit + cfg.burstSize / tickSecs)
      const util    = effectiveRps / cfg.rateLimit
      const errRate = (effectiveRps - allowed) / Math.max(effectiveRps, 1)
      return applyChaos({ outRps: allowed, utilisationPct: util * 100, errorRate: errRate, queueDepth: 0 })
    }

    case NodeType.ObjectStore: {
      const cfg    = node.config as ObjectStoreConfig
      const util   = effectiveRps / cfg.readThroughputMbps
      const failed = failureRoll < cfg.failureRate
      return applyChaos({ outRps: failed ? 0 : effectiveRps, utilisationPct: util * 100, errorRate: failed ? 1 : 0, queueDepth: 0 })
    }

    case NodeType.ExternalService: {
      const cfg    = node.config as ExternalServiceConfig
      const util   = effectiveRps / (cfg.rateLimit || 1000)
      const failed = failureRoll < cfg.failureRate
      const out    = failed ? 0 : (cfg.rateLimit > 0 ? Math.min(effectiveRps, cfg.rateLimit) : effectiveRps)
      return applyChaos({ outRps: out, utilisationPct: util * 100, errorRate: failed ? 1 : 0, queueDepth: 0 })
    }

    case NodeType.LLMGateway: {
      const cfg          = node.config as LLMGatewayConfig
      const tokensPerReq = cfg.avgPromptTokens + cfg.avgCompletionTokens
      const tpmUsed      = effectiveRps * tokensPerReq * 60
      const util         = tpmUsed / cfg.rateLimitTpm
      const failed       = failureRoll < cfg.failureRate
      const maxRps       = cfg.rateLimitTpm / (tokensPerReq * 60)
      return applyChaos({
        outRps:         failed ? 0 : Math.min(effectiveRps, maxRps),
        utilisationPct: util * 100,
        errorRate:      failed ? 1 : Math.max(0, util - 1),
        queueDepth:     0,
      })
    }

    case NodeType.VectorDB: {
      const cfg    = node.config as VectorDBConfig
      const util   = effectiveRps / cfg.queryCapacity
      const failed = failureRoll < cfg.failureRate
      return applyChaos({
        outRps:         failed ? 0 : Math.min(effectiveRps, cfg.queryCapacity),
        utilisationPct: util * 100,
        errorRate:      failed ? 1 : Math.max(0, util - 1),
        queueDepth:     0,
      })
    }

    case NodeType.AgentOrchestrator: {
      const cfg        = node.config as AgentOrchestratorConfig
      const timePerRun = cfg.maxSteps * cfg.stepLatencyMs
      const throughput = (cfg.maxConcurrentAgents * 1000) / Math.max(timePerRun, 1)
      const util       = effectiveRps / throughput
      const failed     = failureRoll < cfg.failureRate
      return applyChaos({
        outRps:         failed ? 0 : Math.min(effectiveRps, throughput),
        utilisationPct: util * 100,
        errorRate:      failed ? 1 : Math.max(0, util - 1),
        queueDepth:     0,
      })
    }

    case NodeType.DNS: {
      const cfg = node.config as DNSConfig
      const cachePct    = Math.min(0.99, 1 - 60 / Math.max(cfg.ttlSeconds, 1))
      const resolvedRps = effectiveRps * (1 - cachePct)
      const regionFactor = 1 / Math.sqrt(Math.max(cfg.regions, 1))
      const capacity    = 50_000 * cfg.regions
      const util        = resolvedRps / capacity
      const failed      = failureRoll < cfg.failureRate
      void regionFactor
      return applyChaos({
        outRps:         failed ? 0 : effectiveRps,
        utilisationPct: util * 100,
        errorRate:      failed ? 1 : 0,
        queueDepth:     0,
      })
    }

    case NodeType.NoSQLStore: {
      const cfg       = node.config as NoSQLStoreConfig
      const readRps   = effectiveRps * 0.8
      const writeRps  = effectiveRps * 0.2 * cfg.replicationFactor
      const readUtil  = readRps  / Math.max(cfg.readCapacity, 1)
      const writeUtil = writeRps / Math.max(cfg.writeCapacity, 1)
      const util      = Math.max(readUtil, writeUtil)
      const failed    = failureRoll < cfg.failureRate
      const totalCap  = cfg.readCapacity + cfg.writeCapacity / cfg.replicationFactor
      return applyChaos({
        outRps:         failed ? 0 : Math.min(effectiveRps, totalCap),
        utilisationPct: util * 100,
        errorRate:      failed ? 1 : Math.max(0, util - 1),
        queueDepth:     0,
      })
    }

    case NodeType.WAF: {
      const cfg     = node.config as WAFConfig
      const allowed = effectiveRps * (1 - cfg.blockRate)
      const util    = effectiveRps / Math.max(cfg.inspectionCapacity, 1)
      const failed  = failureRoll < cfg.failureRate
      // Blocked traffic is intentional filtering, not an error — only real
      // failures (fail-open pass-all) count toward global error rate.
      return applyChaos({
        outRps:         failed ? effectiveRps : allowed,
        utilisationPct: util * 100,
        errorRate:      failed ? cfg.failureRate : 0,
        queueDepth:     0,
      })
    }

    case NodeType.ObservabilityMesh: {
      const cfg  = node.config as ObservabilityMeshConfig
      const util   = effectiveRps / Math.max(cfg.inspectionRps, 1)
      const failed = failureRoll < cfg.failureRate
      return applyChaos({
        outRps:         effectiveRps,
        utilisationPct: util * 100,
        errorRate:      failed ? 0.001 : 0,
        queueDepth:     0,
      })
    }

    case NodeType.ToolRegistry: {
      const cfg  = node.config as ToolRegistryConfig
      const lookupOverhead = Math.log2(Math.max(cfg.toolCount, 2)) / 10
      const effectiveCap   = cfg.capacity / (1 + lookupOverhead)
      const util           = effectiveRps / Math.max(effectiveCap, 1)
      const failed         = failureRoll < cfg.failureRate
      return applyChaos({
        outRps:         failed ? 0 : Math.min(effectiveRps, effectiveCap),
        utilisationPct: util * 100,
        errorRate:      failed ? 1 : Math.max(0, util - 1),
        queueDepth:     0,
      })
    }

    case NodeType.MemoryFabric: {
      const cfg      = node.config as MemoryFabricConfig
      const readRps  = effectiveRps * 0.4
      const writeRps = effectiveRps * 0.6
      const readUtil  = readRps  / Math.max(cfg.readCapacity, 1)
      const writeUtil = writeRps / Math.max(cfg.writeCapacity, 1)
      const util      = Math.max(readUtil, writeUtil)
      const failed    = failureRoll < cfg.failureRate
      return applyChaos({
        outRps:         failed ? 0 : Math.min(effectiveRps, cfg.readCapacity + cfg.writeCapacity),
        utilisationPct: util * 100,
        errorRate:      failed ? 1 : Math.max(0, util - 1),
        queueDepth:     0,
      })
    }

    case NodeType.GraphDB: {
      const cfg      = node.config as GraphDBConfig
      const readRps  = effectiveRps * 0.7
      const writeRps = effectiveRps * 0.3
      const readUtil  = readRps  / Math.max(cfg.queryCapacity, 1)
      const writeUtil = writeRps / Math.max(cfg.writeCapacity, 1)
      const util      = Math.max(readUtil, writeUtil)
      const failed    = failureRoll < cfg.failureRate
      return applyChaos({
        outRps:         failed ? 0 : Math.min(effectiveRps, cfg.queryCapacity + cfg.writeCapacity),
        utilisationPct: util * 100,
        errorRate:      failed ? 1 : Math.max(0, util - 1),
        queueDepth:     0,
      })
    }

    default: {
      const cfg    = (node as SimNode).config as BaseNodeConfig
      const util   = effectiveRps / cfg.capacity
      const failed = failureRoll < (cfg.failureRate ?? 0)
      return applyChaos({
        outRps:         failed ? 0 : Math.min(effectiveRps, cfg.capacity),
        utilisationPct: util * 100,
        errorRate:      failed ? 1 : 0,
        queueDepth:     0,
      })
    }
  }
}
