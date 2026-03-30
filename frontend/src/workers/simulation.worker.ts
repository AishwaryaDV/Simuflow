/**
 * simulation.worker.ts
 * Runs entirely off the main thread.
 * Receives topology via START/UPDATE_TOPOLOGY, runs a tick loop,
 * posts SimulationFrame back on every tick.
 */

import { NodeType, NodeHealth, SimulationStatus } from '../types/topology'
import type {
  TopologySchema, SimNode, SimEdge,
  WorkerInboundMessage, WorkerOutboundMessage,
  SimulationFrame, NodeRuntimeState, EdgeFlowState, MetricSnapshot,
  BaseNodeConfig, ClientConfig, LoadBalancerConfig, CacheConfig, CDNConfig,
  QueueConfig, ApiGatewayConfig, ServerlessConfig, WorkerConfig as WorkerNodeConfig,
  PubSubConfig, StreamConfig, RateLimiterConfig, ObjectStoreConfig,
  ExternalServiceConfig, LLMGatewayConfig, VectorDBConfig, AgentOrchestratorConfig,
} from '../types/topology'

// ── Constants ─────────────────────────────────────────────────────────────────

const TICK_MS   = 200   // real-time interval between frames
const TICK_SECS = 0.2   // each tick represents 0.2 simulated seconds at speed=1

// ── Worker state ──────────────────────────────────────────────────────────────

let topology: TopologySchema | null = null
let speed    = 1
let status: SimulationStatus = SimulationStatus.Idle
let intervalId: ReturnType<typeof setInterval> | null = null
let tickId   = 0

// Persistent per-node state between ticks
const queueDepths  = new Map<string, number>()
const rollingErrors= new Map<string, number[]>() // last 25 ticks (~5s)

// ── Message handler ───────────────────────────────────────────────────────────

self.onmessage = (e: MessageEvent<WorkerInboundMessage>) => {
  const msg = e.data
  switch (msg.type) {
    case 'START':
      topology = msg.topology
      speed    = msg.speed ?? 1
      status   = SimulationStatus.Running
      queueDepths.clear()
      rollingErrors.clear()
      tickId = 0
      startLoop()
      post({ type: 'READY' })
      break

    case 'PAUSE':
      status = SimulationStatus.Paused
      stopLoop()
      break

    case 'RESUME':
      status = SimulationStatus.Running
      startLoop()
      break

    case 'STOP':
      status = SimulationStatus.Idle
      stopLoop()
      topology = null
      queueDepths.clear()
      rollingErrors.clear()
      break

    case 'SET_SPEED':
      speed = msg.speed
      if (status === SimulationStatus.Running) {
        stopLoop(); startLoop()
      }
      break

    case 'UPDATE_TOPOLOGY':
      topology = msg.topology
      break
  }
}

// ── Loop helpers ──────────────────────────────────────────────────────────────

function startLoop() {
  if (intervalId !== null) return
  intervalId = setInterval(tick, Math.round(TICK_MS / speed))
}

function stopLoop() {
  if (intervalId !== null) { clearInterval(intervalId); intervalId = null }
}

function post(msg: WorkerOutboundMessage) {
  self.postMessage(msg)
}

// ── Main tick ─────────────────────────────────────────────────────────────────

function tick() {
  if (!topology) return
  tickId++
  try {
    const frame = computeFrame(topology, tickId)
    post({ type: 'FRAME', frame })
  } catch (err) {
    post({ type: 'ERROR', message: String(err) })
  }
}

// ── Graph helpers ─────────────────────────────────────────────────────────────

/** outEdges[nodeId] = [{ edgeId, targetId }] */
function buildAdjacency(nodes: SimNode[], edges: SimEdge[]) {
  const outEdges = new Map<string, { edgeId: string; targetId: string }[]>()
  const inEdges  = new Map<string, { edgeId: string; sourceId: string }[]>()
  for (const n of nodes) { outEdges.set(n.id, []); inEdges.set(n.id, []) }
  for (const e of edges) {
    outEdges.get(e.sourceId)?.push({ edgeId: e.id, targetId: e.targetId })
    inEdges.get(e.targetId)?.push({ edgeId: e.id, sourceId: e.sourceId })
  }
  return { outEdges, inEdges }
}

/** Kahn's algorithm — returns nodes in processing order (source → sink) */
function topoSort(
  nodes: SimNode[],
  inEdges:  Map<string, { edgeId: string; sourceId: string }[]>,
  outEdges: Map<string, { edgeId: string; targetId: string }[]>,
): SimNode[] {
  const nodeMap  = new Map<string, SimNode>(nodes.map(n => [n.id, n]))
  const inDegree = new Map<string, number>()
  for (const n of nodes) inDegree.set(n.id, inEdges.get(n.id)?.length ?? 0)

  const queue   = nodes.filter(n => (inDegree.get(n.id) ?? 0) === 0)
  const result: SimNode[] = []
  const visited = new Set<string>()

  while (queue.length > 0) {
    const node = queue.shift()!
    if (visited.has(node.id)) continue
    visited.add(node.id)
    result.push(node)

    for (const { targetId } of outEdges.get(node.id) ?? []) {
      const deg = (inDegree.get(targetId) ?? 1) - 1
      inDegree.set(targetId, deg)
      if (deg === 0 && !visited.has(targetId)) {
        const target = nodeMap.get(targetId)
        if (target) queue.push(target)
      }
    }
  }

  // Append any nodes not reached (cycles / disconnected islands)
  for (const n of nodes) { if (!visited.has(n.id)) result.push(n) }
  return result
}

// ── Node transfer functions ───────────────────────────────────────────────────

interface NodeFlow {
  outRps:         number   // requests/sec leaving this node
  utilisationPct: number
  errorRate:      number   // 0–1
  queueDepth:     number
}

function computeNodeFlow(node: SimNode, incomingRps: number): NodeFlow {
  const failureRoll = Math.random()
  const tickSecs    = TICK_SECS * speed

  switch (node.nodeType) {

    case NodeType.Client: {
      const cfg   = node.config as ClientConfig
      const burst = cfg.burst && (tickId % 30 < 5) ? 3 : 1  // every 6s burst for 1s
      const out   = cfg.rps * burst
      return { outRps: out, utilisationPct: 0, errorRate: 0, queueDepth: 0 }
    }

    case NodeType.LoadBalancer: {
      const cfg   = node.config as LoadBalancerConfig
      const util  = incomingRps / cfg.capacity
      const failed= failureRoll < cfg.failureRate
      const out   = failed ? 0 : incomingRps  // LB passes through (splitting done by edge distribution)
      return { outRps: out, utilisationPct: util * 100, errorRate: failed ? 1 : 0, queueDepth: 0 }
    }

    case NodeType.ApiGateway: {
      const cfg    = node.config as ApiGatewayConfig
      const limited= cfg.rateLimit > 0 ? Math.min(incomingRps, cfg.rateLimit) : incomingRps
      const util   = incomingRps / cfg.capacity
      const failed = failureRoll < cfg.failureRate
      const out    = failed ? 0 : limited
      const errRate= (incomingRps - limited) / Math.max(incomingRps, 1)
      return { outRps: out, utilisationPct: util * 100, errorRate: failed ? 1 : errRate, queueDepth: 0 }
    }

    case NodeType.ApiServer:
    case NodeType.Microservice: {
      const cfg   = node.config as BaseNodeConfig
      const util  = incomingRps / cfg.capacity
      const failed= failureRoll < cfg.failureRate
      const out   = failed ? 0 : Math.min(incomingRps, cfg.capacity)
      return { outRps: out, utilisationPct: util * 100, errorRate: failed ? 1 : Math.max(0, util - 1), queueDepth: 0 }
    }

    case NodeType.Cache: {
      const cfg  = node.config as CacheConfig
      const util = incomingRps / cfg.capacity
      const out  = incomingRps * (1 - cfg.hitRate)  // only misses go downstream
      return { outRps: out, utilisationPct: util * 100, errorRate: 0, queueDepth: 0 }
    }

    case NodeType.CDN: {
      const cfg  = node.config as CDNConfig
      const util = incomingRps / cfg.capacity
      const out  = incomingRps * (1 - cfg.hitRate)
      return { outRps: out, utilisationPct: util * 100, errorRate: 0, queueDepth: 0 }
    }

    case NodeType.Database: {
      const cfg   = node.config as BaseNodeConfig
      const util  = incomingRps / cfg.capacity
      const failed= failureRoll < cfg.failureRate
      const out   = failed ? 0 : Math.min(incomingRps, cfg.capacity)
      return { outRps: out, utilisationPct: util * 100, errorRate: failed ? 1 : Math.max(0, util - 1), queueDepth: 0 }
    }

    case NodeType.Queue: {
      const cfg    = node.config as QueueConfig
      const prev   = queueDepths.get(node.id) ?? 0
      const added  = incomingRps * tickSecs
      const drained= (1 / (cfg.delayMs / 1000 || 0.1)) * tickSecs  // drain rate = 1/delay
      const depth  = Math.max(0, prev + added - drained)
      const capped = cfg.maxDepth > 0 ? Math.min(depth, cfg.maxDepth) : depth
      queueDepths.set(node.id, capped)
      const util   = cfg.maxDepth > 0 ? capped / cfg.maxDepth : Math.min(capped / 1000, 1)
      return { outRps: drained / tickSecs, utilisationPct: util * 100, errorRate: 0, queueDepth: Math.round(capped) }
    }

    case NodeType.Serverless: {
      const cfg   = node.config as ServerlessConfig
      const cold  = Math.random() < cfg.coldStartProbability
      const effMs = cold ? cfg.coldStartMs : cfg.warmLatencyMs
      const throughput = (cfg.concurrencyLimit * 1000) / Math.max(effMs, 1)
      const util  = incomingRps / throughput
      const failed= failureRoll < cfg.failureRate
      const out   = failed ? 0 : Math.min(incomingRps, throughput)
      return { outRps: out, utilisationPct: util * 100, errorRate: failed ? 1 : Math.max(0, util - 1), queueDepth: 0 }
    }

    case NodeType.Worker: {
      const cfg  = node.config as WorkerNodeConfig
      const prev = queueDepths.get(node.id) ?? 0
      const added= incomingRps * tickSecs
      const drained = cfg.throughput * tickSecs
      const depth= Math.max(0, prev + added - drained)
      queueDepths.set(node.id, depth)
      const util = incomingRps / cfg.throughput
      const failed= failureRoll < cfg.failureRate
      const out  = failed ? 0 : Math.min(incomingRps, cfg.throughput)
      return { outRps: out, utilisationPct: util * 100, errorRate: failed ? 1 : 0, queueDepth: Math.round(depth) }
    }

    case NodeType.PubSub: {
      const cfg  = node.config as PubSubConfig
      const prev = queueDepths.get(node.id) ?? 0
      const added= incomingRps * tickSecs
      const drain= (1 / (cfg.deliveryLatencyMs / 1000 || 0.01)) * tickSecs
      const depth= Math.max(0, prev + added - drain)
      const capped = cfg.maxDepth > 0 ? Math.min(depth, cfg.maxDepth) : depth
      queueDepths.set(node.id, capped)
      const util = cfg.maxDepth > 0 ? capped / cfg.maxDepth : Math.min(capped / 1000, 1)
      // fan-out: each subscriber gets full throughput
      const out  = (drain / tickSecs) * cfg.subscriberCount
      return { outRps: out, utilisationPct: util * 100, errorRate: failureRoll < cfg.failureRate ? 1 : 0, queueDepth: Math.round(capped) }
    }

    case NodeType.Stream: {
      const cfg  = node.config as StreamConfig
      const util = incomingRps / cfg.throughput
      const failed= failureRoll < cfg.failureRate
      const out  = failed ? 0 : Math.min(incomingRps, cfg.throughput) * cfg.consumerGroups
      return { outRps: out, utilisationPct: util * 100, errorRate: failed ? 1 : 0, queueDepth: 0 }
    }

    case NodeType.RateLimiter: {
      const cfg    = node.config as RateLimiterConfig
      const allowed= Math.min(incomingRps, cfg.rateLimit + cfg.burstSize / tickSecs)
      const util   = incomingRps / cfg.rateLimit
      const dropped= incomingRps - allowed
      const errRate= dropped / Math.max(incomingRps, 1)
      return { outRps: allowed, utilisationPct: util * 100, errorRate: errRate, queueDepth: 0 }
    }

    case NodeType.ObjectStore: {
      const cfg  = node.config as ObjectStoreConfig
      const util = incomingRps / cfg.readThroughputMbps  // treat rps as MB/s here
      const failed= failureRoll < cfg.failureRate
      const out  = failed ? 0 : incomingRps
      return { outRps: out, utilisationPct: util * 100, errorRate: failed ? 1 : 0, queueDepth: 0 }
    }

    case NodeType.ExternalService: {
      const cfg  = node.config as ExternalServiceConfig
      const util = incomingRps / (cfg.rateLimit || 1000)
      const failed= failureRoll < cfg.failureRate
      const out  = failed ? 0 : (cfg.rateLimit > 0 ? Math.min(incomingRps, cfg.rateLimit) : incomingRps)
      return { outRps: out, utilisationPct: util * 100, errorRate: failed ? 1 : 0, queueDepth: 0 }
    }

    case NodeType.LLMGateway: {
      const cfg  = node.config as LLMGatewayConfig
      const tokensPerReq = cfg.avgPromptTokens + cfg.avgCompletionTokens
      const tpmUsed      = incomingRps * tokensPerReq * 60
      const util = tpmUsed / cfg.rateLimitTpm
      const failed= failureRoll < cfg.failureRate
      const maxRps = cfg.rateLimitTpm / (tokensPerReq * 60)
      const out  = failed ? 0 : Math.min(incomingRps, maxRps)
      return { outRps: out, utilisationPct: util * 100, errorRate: failed ? 1 : Math.max(0, util - 1), queueDepth: 0 }
    }

    case NodeType.VectorDB: {
      const cfg  = node.config as VectorDBConfig
      const util = incomingRps / cfg.queryCapacity
      const failed= failureRoll < cfg.failureRate
      const out  = failed ? 0 : Math.min(incomingRps, cfg.queryCapacity)
      return { outRps: out, utilisationPct: util * 100, errorRate: failed ? 1 : Math.max(0, util - 1), queueDepth: 0 }
    }

    case NodeType.AgentOrchestrator: {
      const cfg  = node.config as AgentOrchestratorConfig
      const timePerAgent = cfg.maxSteps * cfg.stepLatencyMs   // ms per agent run
      const throughput   = (cfg.maxConcurrentAgents * 1000) / Math.max(timePerAgent, 1)
      const util = incomingRps / throughput
      const failed= failureRoll < cfg.failureRate
      const out  = failed ? 0 : Math.min(incomingRps, throughput)
      return { outRps: out, utilisationPct: util * 100, errorRate: failed ? 1 : Math.max(0, util - 1), queueDepth: 0 }
    }

    default: {
      const cfg  = (node as SimNode).config as BaseNodeConfig
      const util = incomingRps / cfg.capacity
      const failed= failureRoll < (cfg.failureRate ?? 0)
      const out  = failed ? 0 : Math.min(incomingRps, cfg.capacity)
      return { outRps: out, utilisationPct: util * 100, errorRate: failed ? 1 : 0, queueDepth: 0 }
    }
  }
}

// ── Health from utilisation ───────────────────────────────────────────────────

function healthFrom(utilisationPct: number, errorRate: number): NodeHealth {
  if (errorRate >= 0.5)      return NodeHealth.Failed
  if (utilisationPct >= 90)  return NodeHealth.Bottleneck
  if (utilisationPct >= 60)  return NodeHealth.Stressed
  return NodeHealth.Healthy
}

// ── Rolling error average ─────────────────────────────────────────────────────

function rollingError(nodeId: string, latest: number): number {
  const arr = rollingErrors.get(nodeId) ?? []
  arr.push(latest)
  if (arr.length > 25) arr.shift()
  rollingErrors.set(nodeId, arr)
  return arr.reduce((s, v) => s + v, 0) / arr.length
}

// ── Frame computation ─────────────────────────────────────────────────────────

function computeFrame(topo: TopologySchema, tick: number): SimulationFrame {
  const { nodes, edges } = topo
  const simNodes = nodes.filter(n => n.nodeType !== undefined)

  const { outEdges, inEdges } = buildAdjacency(simNodes, edges)
  const sorted = topoSort(simNodes, inEdges, outEdges)

  // outflow[nodeId] = rps leaving that node
  const outflow  = new Map<string, number>()
  // edgeRps[edgeId] = rps on that edge
  const edgeRps  = new Map<string, number>()

  // Clients generate their own outflow; all others start at 0
  for (const n of simNodes) {
    if (n.nodeType === NodeType.Client) {
      const cfg = n.config as ClientConfig
      const burst = cfg.burst && (tick % 30 < 5) ? 3 : 1
      outflow.set(n.id, cfg.rps * burst * speed)
    } else {
      outflow.set(n.id, 0)
    }
  }

  const nodeStates: Record<string, NodeRuntimeState> = {}

  for (const node of sorted) {
    // Sum incoming RPS from all upstream edges
    const incoming = (inEdges.get(node.id) ?? []).reduce((sum, { edgeId }) => {
      return sum + (edgeRps.get(edgeId) ?? 0)
    }, 0)

    // For clients, incoming is always 0 — they self-generate
    const effectiveIncoming = node.nodeType === NodeType.Client ? 0 : incoming

    const outs = outEdges.get(node.id) ?? []
    const flow = computeNodeFlow(node, effectiveIncoming)

    // Distribute outflow evenly across outgoing edges
    const perEdge = outs.length > 0 ? flow.outRps / outs.length : 0
    for (const { edgeId } of outs) {
      edgeRps.set(edgeId, perEdge)
    }
    outflow.set(node.id, flow.outRps)

    const smoothErr = rollingError(node.id, flow.errorRate)

    nodeStates[node.id] = {
      nodeId:         node.id,
      health:         healthFrom(flow.utilisationPct, smoothErr),
      utilisationPct: Math.min(flow.utilisationPct, 200),
      currentRps:     node.nodeType === NodeType.Client
                        ? (flow.outRps)
                        : effectiveIncoming,
      queueDepth:     flow.queueDepth,
      errorRate:      smoothErr,
    }
  }

  // Edge flow states
  const edgeFlows: Record<string, EdgeFlowState> = {}
  for (const edge of edges) {
    const rps = edgeRps.get(edge.id) ?? 0
    edgeFlows[edge.id] = {
      edgeId:        edge.id,
      particleCount: Math.min(12, Math.ceil(rps / 50)),
      throughput:    rps,
      errorRatio:    0,
      isPartitioned: false,
    }
  }

  // Global metrics
  const clientNodes  = simNodes.filter(n => n.nodeType === NodeType.Client)
  const totalRps     = clientNodes.reduce((s, n) => s + (outflow.get(n.id) ?? 0), 0)
  const allStates    = Object.values(nodeStates)
  const avgErr       = allStates.length
    ? allStates.reduce((s, n) => s + n.errorRate, 0) / allStates.length
    : 0

  const globalMetrics: MetricSnapshot = {
    timestamp:    Date.now(),
    throughput:   totalRps,
    p50LatencyMs: 0,
    p95LatencyMs: 0,
    p99LatencyMs: 0,
    errorRate:    avgErr,
    totalRequests: tick * totalRps * TICK_SECS,
  }

  return {
    tickId:    tick,
    timestamp: Date.now(),
    nodeStates,
    edgeFlows,
    globalMetrics,
    chaosEvents: [],
    bottlenecks: allStates.filter(s => s.utilisationPct > 90).map(s => s.nodeId),
  }
}
