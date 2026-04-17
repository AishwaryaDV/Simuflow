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
  SimNode,
  BaseNodeConfig, ClientConfig, LoadBalancerConfig, CacheConfig, CDNConfig,
  QueueConfig, ApiGatewayConfig, ServerlessConfig, WorkerConfig as WorkerNodeConfig,
  PubSubConfig, StreamConfig, RateLimiterConfig, ObjectStoreConfig,
  ExternalServiceConfig, LLMGatewayConfig, VectorDBConfig, AgentOrchestratorConfig,
  DNSConfig, NoSQLStoreConfig,
} from '../types/topology'

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
): NodeFlow {
  const failureRoll = Math.random()

  switch (node.nodeType) {

    case NodeType.Client: {
      const cfg   = node.config as ClientConfig
      const burst = cfg.burst && (tickId % 30 < 5) ? 3 : 1
      return { outRps: cfg.rps * burst, utilisationPct: 0, errorRate: 0, queueDepth: 0 }
    }

    case NodeType.LoadBalancer: {
      const cfg    = node.config as LoadBalancerConfig
      const util   = incomingRps / cfg.capacity
      const failed = failureRoll < cfg.failureRate
      return { outRps: failed ? 0 : incomingRps, utilisationPct: util * 100, errorRate: failed ? 1 : 0, queueDepth: 0 }
    }

    case NodeType.ApiGateway: {
      const cfg     = node.config as ApiGatewayConfig
      const limited = cfg.rateLimit > 0 ? Math.min(incomingRps, cfg.rateLimit) : incomingRps
      const util    = incomingRps / cfg.capacity
      const failed  = failureRoll < cfg.failureRate
      const errRate = (incomingRps - limited) / Math.max(incomingRps, 1)
      return { outRps: failed ? 0 : limited, utilisationPct: util * 100, errorRate: failed ? 1 : errRate, queueDepth: 0 }
    }

    case NodeType.ApiServer:
    case NodeType.Microservice: {
      const cfg   = node.config as BaseNodeConfig
      const util  = incomingRps / cfg.capacity
      const failed = failureRoll < cfg.failureRate
      return {
        outRps:         failed ? 0 : Math.min(incomingRps, cfg.capacity),
        utilisationPct: util * 100,
        errorRate:      failed ? 1 : Math.max(0, util - 1),
        queueDepth:     0,
      }
    }

    case NodeType.Cache: {
      const cfg  = node.config as CacheConfig
      return { outRps: incomingRps * (1 - cfg.hitRate), utilisationPct: (incomingRps / cfg.capacity) * 100, errorRate: 0, queueDepth: 0 }
    }

    case NodeType.CDN: {
      const cfg  = node.config as CDNConfig
      return { outRps: incomingRps * (1 - cfg.hitRate), utilisationPct: (incomingRps / cfg.capacity) * 100, errorRate: 0, queueDepth: 0 }
    }

    case NodeType.Database: {
      const cfg    = node.config as BaseNodeConfig
      const util   = incomingRps / cfg.capacity
      const failed = failureRoll < cfg.failureRate
      return {
        outRps:         failed ? 0 : Math.min(incomingRps, cfg.capacity),
        utilisationPct: util * 100,
        errorRate:      failed ? 1 : Math.max(0, util - 1),
        queueDepth:     0,
      }
    }

    case NodeType.Queue: {
      const cfg    = node.config as QueueConfig
      const prev   = state.queueDepths.get(node.id) ?? 0
      const added  = incomingRps * tickSecs
      const drained = (1 / (cfg.delayMs / 1000 || 0.1)) * tickSecs
      const depth  = Math.max(0, prev + added - drained)
      const capped = cfg.maxDepth > 0 ? Math.min(depth, cfg.maxDepth) : depth
      state.queueDepths.set(node.id, capped)
      const util = cfg.maxDepth > 0 ? capped / cfg.maxDepth : Math.min(capped / 1000, 1)
      return { outRps: drained / tickSecs, utilisationPct: util * 100, errorRate: 0, queueDepth: Math.round(capped) }
    }

    case NodeType.Serverless: {
      const cfg        = node.config as ServerlessConfig
      const cold       = Math.random() < cfg.coldStartProbability
      const effMs      = cold ? cfg.coldStartMs : cfg.warmLatencyMs
      const throughput = (cfg.concurrencyLimit * 1000) / Math.max(effMs, 1)
      const util       = incomingRps / throughput
      const failed     = failureRoll < cfg.failureRate
      return {
        outRps:         failed ? 0 : Math.min(incomingRps, throughput),
        utilisationPct: util * 100,
        errorRate:      failed ? 1 : Math.max(0, util - 1),
        queueDepth:     0,
      }
    }

    case NodeType.Worker: {
      const cfg    = node.config as WorkerNodeConfig
      const prev   = state.queueDepths.get(node.id) ?? 0
      const added  = incomingRps * tickSecs
      const drained = cfg.throughput * tickSecs
      const depth  = Math.max(0, prev + added - drained)
      state.queueDepths.set(node.id, depth)
      const util   = incomingRps / cfg.throughput
      const failed = failureRoll < cfg.failureRate
      return {
        outRps:         failed ? 0 : Math.min(incomingRps, cfg.throughput),
        utilisationPct: util * 100,
        errorRate:      failed ? 1 : 0,
        queueDepth:     Math.round(depth),
      }
    }

    case NodeType.PubSub: {
      const cfg    = node.config as PubSubConfig
      const prev   = state.queueDepths.get(node.id) ?? 0
      const added  = incomingRps * tickSecs
      const drain  = (1 / (cfg.deliveryLatencyMs / 1000 || 0.01)) * tickSecs
      const depth  = Math.max(0, prev + added - drain)
      const capped = cfg.maxDepth > 0 ? Math.min(depth, cfg.maxDepth) : depth
      state.queueDepths.set(node.id, capped)
      const util   = cfg.maxDepth > 0 ? capped / cfg.maxDepth : Math.min(capped / 1000, 1)
      return {
        outRps:         (drain / tickSecs) * cfg.subscriberCount,
        utilisationPct: util * 100,
        errorRate:      failureRoll < cfg.failureRate ? 1 : 0,
        queueDepth:     Math.round(capped),
      }
    }

    case NodeType.Stream: {
      const cfg    = node.config as StreamConfig
      const util   = incomingRps / cfg.throughput
      const failed = failureRoll < cfg.failureRate
      return {
        outRps:         failed ? 0 : Math.min(incomingRps, cfg.throughput) * cfg.consumerGroups,
        utilisationPct: util * 100,
        errorRate:      failed ? 1 : 0,
        queueDepth:     0,
      }
    }

    case NodeType.RateLimiter: {
      const cfg     = node.config as RateLimiterConfig
      const allowed = Math.min(incomingRps, cfg.rateLimit + cfg.burstSize / tickSecs)
      const util    = incomingRps / cfg.rateLimit
      const errRate = (incomingRps - allowed) / Math.max(incomingRps, 1)
      return { outRps: allowed, utilisationPct: util * 100, errorRate: errRate, queueDepth: 0 }
    }

    case NodeType.ObjectStore: {
      const cfg    = node.config as ObjectStoreConfig
      const util   = incomingRps / cfg.readThroughputMbps
      const failed = failureRoll < cfg.failureRate
      return { outRps: failed ? 0 : incomingRps, utilisationPct: util * 100, errorRate: failed ? 1 : 0, queueDepth: 0 }
    }

    case NodeType.ExternalService: {
      const cfg    = node.config as ExternalServiceConfig
      const util   = incomingRps / (cfg.rateLimit || 1000)
      const failed = failureRoll < cfg.failureRate
      const out    = failed ? 0 : (cfg.rateLimit > 0 ? Math.min(incomingRps, cfg.rateLimit) : incomingRps)
      return { outRps: out, utilisationPct: util * 100, errorRate: failed ? 1 : 0, queueDepth: 0 }
    }

    case NodeType.LLMGateway: {
      const cfg          = node.config as LLMGatewayConfig
      const tokensPerReq = cfg.avgPromptTokens + cfg.avgCompletionTokens
      const tpmUsed      = incomingRps * tokensPerReq * 60
      const util         = tpmUsed / cfg.rateLimitTpm
      const failed       = failureRoll < cfg.failureRate
      const maxRps       = cfg.rateLimitTpm / (tokensPerReq * 60)
      return {
        outRps:         failed ? 0 : Math.min(incomingRps, maxRps),
        utilisationPct: util * 100,
        errorRate:      failed ? 1 : Math.max(0, util - 1),
        queueDepth:     0,
      }
    }

    case NodeType.VectorDB: {
      const cfg    = node.config as VectorDBConfig
      const util   = incomingRps / cfg.queryCapacity
      const failed = failureRoll < cfg.failureRate
      return {
        outRps:         failed ? 0 : Math.min(incomingRps, cfg.queryCapacity),
        utilisationPct: util * 100,
        errorRate:      failed ? 1 : Math.max(0, util - 1),
        queueDepth:     0,
      }
    }

    case NodeType.AgentOrchestrator: {
      const cfg        = node.config as AgentOrchestratorConfig
      const timePerRun = cfg.maxSteps * cfg.stepLatencyMs
      const throughput = (cfg.maxConcurrentAgents * 1000) / Math.max(timePerRun, 1)
      const util       = incomingRps / throughput
      const failed     = failureRoll < cfg.failureRate
      return {
        outRps:         failed ? 0 : Math.min(incomingRps, throughput),
        utilisationPct: util * 100,
        errorRate:      failed ? 1 : Math.max(0, util - 1),
        queueDepth:     0,
      }
    }

    case NodeType.DNS: {
      const cfg = node.config as DNSConfig
      // TTL caching: higher TTL means more queries served from client cache,
      // reducing effective load on the resolver. cachePct grows with TTL.
      const cachePct   = Math.min(0.99, 1 - 60 / Math.max(cfg.ttlSeconds, 1))
      const resolvedRps = incomingRps * (1 - cachePct)
      // latency benefit from more regions (each doubling regions cuts latency ~20%)
      const regionFactor = 1 / Math.sqrt(Math.max(cfg.regions, 1))
      const capacity   = 50_000 * cfg.regions   // DNS resolvers scale horizontally
      const util       = resolvedRps / capacity
      const failed     = failureRoll < cfg.failureRate
      void regionFactor   // used for latency context in metricAggregator
      return {
        outRps:         failed ? 0 : incomingRps,  // DNS passes all traffic through
        utilisationPct: util * 100,
        errorRate:      failed ? 1 : 0,
        queueDepth:     0,
      }
    }

    case NodeType.NoSQLStore: {
      const cfg        = node.config as NoSQLStoreConfig
      // Assume 80% reads, 20% writes (typical workload)
      const readRps    = incomingRps * 0.8
      const writeRps   = incomingRps * 0.2 * cfg.replicationFactor  // writes fan out
      const readUtil   = readRps  / Math.max(cfg.readCapacity, 1)
      const writeUtil  = writeRps / Math.max(cfg.writeCapacity, 1)
      const util       = Math.max(readUtil, writeUtil)               // bottleneck dimension
      const failed     = failureRoll < cfg.failureRate
      const totalCapacity = cfg.readCapacity + cfg.writeCapacity / cfg.replicationFactor
      return {
        outRps:         failed ? 0 : Math.min(incomingRps, totalCapacity),
        utilisationPct: util * 100,
        errorRate:      failed ? 1 : Math.max(0, util - 1),
        queueDepth:     0,
      }
    }

    default: {
      const cfg    = (node as SimNode).config as BaseNodeConfig
      const util   = incomingRps / cfg.capacity
      const failed = failureRoll < (cfg.failureRate ?? 0)
      return {
        outRps:         failed ? 0 : Math.min(incomingRps, cfg.capacity),
        utilisationPct: util * 100,
        errorRate:      failed ? 1 : 0,
        queueDepth:     0,
      }
    }
  }
}
