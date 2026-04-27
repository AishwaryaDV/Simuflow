/**
 * simulation.worker.ts
 * Runs entirely off the main thread.
 * Receives topology via START/UPDATE_TOPOLOGY, runs a tick loop,
 * posts SimulationFrame back on every tick.
 *
 * Computation is delegated to three modules:
 *   constraintSolver  — per-node transfer functions + queue/error state
 *   metricAggregator  — global p50/p95/p99, error rate, throughput
 *   particleEmitter   — edge RPS → particle counts
 */

import { NodeType, SimulationStatus } from '../types/topology'
import type {
  TopologySchema, SimNode, SimEdge,
  WorkerInboundMessage, WorkerOutboundMessage,
  SimulationFrame, NodeRuntimeState,
  ClientConfig, ActiveScenario,
} from '../types/topology'
import { SolverState, computeNodeFlow, healthFrom, buildChaosModifier } from './constraintSolver'
import { aggregateMetrics } from './metricAggregator'
import { emitEdgeFlows } from './particleEmitter'

// ── Constants ─────────────────────────────────────────────────────────────────

const TICK_MS   = 200   // real-time interval between frames
const TICK_SECS = 0.2   // each tick = 0.2 simulated seconds at speed=1

// ── Worker state ──────────────────────────────────────────────────────────────

let topology:   TopologySchema | null = null
let speed       = 1
let status:     SimulationStatus = SimulationStatus.Idle
let intervalId: ReturnType<typeof setInterval> | null = null
let tickId      = 0

const solverState   = new SolverState()
const workerChaos   = new Map<string, ActiveScenario>()

// ── Message handler ───────────────────────────────────────────────────────────

self.onmessage = (e: MessageEvent<WorkerInboundMessage>) => {
  const msg = e.data
  switch (msg.type) {
    case 'START':
      topology = msg.topology
      speed    = msg.speed ?? 1
      status   = SimulationStatus.Running
      solverState.reset()
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
      solverState.reset()
      workerChaos.clear()
      break

    case 'SET_SPEED':
      speed = msg.speed
      if (status === SimulationStatus.Running) { stopLoop(); startLoop() }
      break

    case 'UPDATE_TOPOLOGY':
      topology = msg.topology
      break

    case 'ACTIVATE_CHAOS':
      workerChaos.set(msg.scenario.id, msg.scenario)
      break

    case 'DEACTIVATE_CHAOS':
      workerChaos.delete(msg.instanceId)
      break
  }
}

// ── Loop ──────────────────────────────────────────────────────────────────────

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

// ── Tick ──────────────────────────────────────────────────────────────────────

function tick() {
  if (!topology) return
  tickId++
  try {
    post({ type: 'FRAME', frame: computeFrame(topology, tickId) })
  } catch (err) {
    post({ type: 'ERROR', message: String(err) })
  }
}

// ── Graph helpers ─────────────────────────────────────────────────────────────

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

/** Kahn's algorithm — source → sink ordering */
function topoSort(
  nodes:    SimNode[],
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

  // Append disconnected / cyclic nodes
  for (const n of nodes) { if (!visited.has(n.id)) result.push(n) }
  return result
}

// ── Frame ─────────────────────────────────────────────────────────────────────

function computeFrame(topo: TopologySchema, tick: number): SimulationFrame {
  const { nodes, edges } = topo
  const simNodes = nodes.filter(n => n.nodeType !== undefined)
  const tickSecs = TICK_SECS * speed

  const { outEdges, inEdges } = buildAdjacency(simNodes, edges)
  const sorted = topoSort(simNodes, inEdges, outEdges)

  const outflow = new Map<string, number>()
  const edgeRps = new Map<string, number>()

  // Seed client outflows; all others start at 0
  for (const n of simNodes) {
    if (n.nodeType === NodeType.Client) {
      const cfg   = n.config as ClientConfig
      const burst = cfg.burst && (tick % 30 < 5) ? 3 : 1
      outflow.set(n.id, cfg.rps * burst * speed)
    } else {
      outflow.set(n.id, 0)
    }
  }

  const nodeStates: Record<string, NodeRuntimeState> = {}

  for (const node of sorted) {
    const incoming = (inEdges.get(node.id) ?? [])
      .reduce((sum, { edgeId }) => sum + (edgeRps.get(edgeId) ?? 0), 0)

    const effectiveIncoming = node.nodeType === NodeType.Client ? 0 : incoming

    const outs = outEdges.get(node.id) ?? []
    const chaosModifier = buildChaosModifier(node.id, workerChaos)
    const flow = computeNodeFlow(node, effectiveIncoming, solverState, tick, tickSecs, chaosModifier)

    // Distribute outflow evenly across outgoing edges
    const perEdge = outs.length > 0 ? flow.outRps / outs.length : 0
    for (const { edgeId } of outs) edgeRps.set(edgeId, perEdge)
    outflow.set(node.id, flow.outRps)

    const smoothErr = solverState.rollingError(node.id, flow.errorRate)

    nodeStates[node.id] = {
      nodeId:         node.id,
      health:         healthFrom(flow.utilisationPct, smoothErr),
      utilisationPct: Math.min(flow.utilisationPct, 200),
      currentRps:     node.nodeType === NodeType.Client ? flow.outRps : effectiveIncoming,
      queueDepth:     flow.queueDepth,
      errorRate:      smoothErr,
    }
  }

  const globalMetrics = aggregateMetrics(simNodes, nodeStates, outflow, tick, speed)
  const edgeFlows     = emitEdgeFlows(edges, edgeRps)
  const bottlenecks   = Object.values(nodeStates)
    .filter(s => s.utilisationPct > 90)
    .map(s => s.nodeId)

  return {
    tickId:    tick,
    timestamp: Date.now(),
    nodeStates,
    edgeFlows,
    globalMetrics,
    chaosEvents: [],
    bottlenecks,
  }
}
