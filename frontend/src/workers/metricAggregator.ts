/**
 * metricAggregator.ts
 * Computes global MetricSnapshot from per-node runtime states.
 *
 * Latency model (queueing theory approximation):
 *   p50 = Σ (nodeBaseLatencyMs × loadFactor) across all non-client nodes
 *   p95 = p50 × (1 + tailMultiplier × 0.5)   — tail grows with avg utilisation
 *   p99 = p50 × (1 + tailMultiplier)          — much worse under saturation
 *
 * tailMultiplier = 1 + (avgUtil / 100) × 3  →  ranges 1× (idle) to 4× (100% util)
 */

import { NodeType } from '../types/topology'
import type { SimNode, NodeRuntimeState, MetricSnapshot, BaseNodeConfig } from '../types/topology'

const TICK_SECS = 0.2  // matches simulation.worker.ts

export function aggregateMetrics(
  simNodes:    SimNode[],
  nodeStates:  Record<string, NodeRuntimeState>,
  outflow:     Map<string, number>,
  tick:        number,
  speed:       number,
): MetricSnapshot {
  const allStates = Object.values(nodeStates)

  // Throughput = sum of all Client outflows
  const totalRps = simNodes
    .filter(n => n.nodeType === NodeType.Client)
    .reduce((s, n) => s + (outflow.get(n.id) ?? 0), 0)

  // Global error rate = average across all nodes
  const avgErr = allStates.length
    ? allStates.reduce((s, n) => s + n.errorRate, 0) / allStates.length
    : 0

  // Latency — sum configured latency across non-client nodes, weighted by load
  const nonClientStates = allStates.filter(s => {
    const n = simNodes.find(n => n.id === s.nodeId)
    return n && n.nodeType !== NodeType.Client
  })

  const p50 = nonClientStates.reduce((sum, s) => {
    const n = simNodes.find(n => n.id === s.nodeId)
    if (!n) return sum
    const cfg    = n.config as BaseNodeConfig
    const baseMs = (cfg as any).latencyMs ?? (cfg as any).warmLatencyMs ?? (cfg as any).queryLatencyMs ?? 10
    const loadFactor = 1 + Math.max(0, s.utilisationPct / 100)
    return sum + baseMs * loadFactor
  }, 0)

  const avgUtil = nonClientStates.length
    ? nonClientStates.reduce((s, n) => s + n.utilisationPct, 0) / nonClientStates.length
    : 0
  const tailMultiplier = 1 + (avgUtil / 100) * 3
  const p95 = p50 * (1 + tailMultiplier * 0.5)
  const p99 = p50 * (1 + tailMultiplier)

  return {
    timestamp:     Date.now(),
    throughput:    totalRps,
    p50LatencyMs:  Math.round(p50),
    p95LatencyMs:  Math.round(p95),
    p99LatencyMs:  Math.round(p99),
    errorRate:     avgErr,
    totalRequests: tick * totalRps * TICK_SECS * speed,
  }
}
