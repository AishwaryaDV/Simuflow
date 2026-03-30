/**
 * particleEmitter.ts
 * Maps per-edge RPS to EdgeFlowState (particle count, throughput, error ratio).
 *
 * Particle count is capped at 12 to keep the canvas readable.
 * One particle per 50 RPS, minimum 0 when edge is idle.
 */

import type { SimEdge, EdgeFlowState } from '../types/topology'

export function emitEdgeFlows(
  edges:   SimEdge[],
  edgeRps: Map<string, number>,
): Record<string, EdgeFlowState> {
  const result: Record<string, EdgeFlowState> = {}

  for (const edge of edges) {
    const rps = edgeRps.get(edge.id) ?? 0
    result[edge.id] = {
      edgeId:        edge.id,
      particleCount: Math.min(12, Math.ceil(rps / 50)),
      throughput:    rps,
      errorRatio:    0,
      isPartitioned: false,
    }
  }

  return result
}
