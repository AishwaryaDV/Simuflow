import { describe, it, expect } from 'vitest'
import { aggregateMetrics } from '../workers/metricAggregator'
import { NodeType } from '../types/topology'
import type { SimNode, NodeRuntimeState } from '../types/topology'

function makeClient(id: string, rps: number): SimNode {
  return { id, label: id, position: { x: 0, y: 0 }, nodeType: NodeType.Client, config: { rps, burst: false } } as SimNode
}

function makeServer(id: string): SimNode {
  return { id, label: id, position: { x: 0, y: 0 }, nodeType: NodeType.ApiServer, config: { capacity: 1000, latencyMs: 50, failureRate: 0, timeoutMs: 5000 } } as SimNode
}

function makeState(nodeId: string, util: number, err: number): NodeRuntimeState {
  return { nodeId, outRps: 100, utilisationPct: util, errorRate: err, queueDepth: 0, health: 'healthy' } as NodeRuntimeState
}

describe('aggregateMetrics', () => {
  it('accumulates totalRequests from previous ticks', () => {
    const nodes = [makeClient('c1', 100)]
    const outflow = new Map([['c1', 100]])
    const states = { c1: makeState('c1', 0, 0) }

    const m1 = aggregateMetrics(nodes, states, outflow, 0)
    // TICK_SECS = 0.2, so 100 rps * 0.2 = 20 requests
    expect(m1.totalRequests).toBe(20)

    const m2 = aggregateMetrics(nodes, states, outflow, m1.totalRequests)
    expect(m2.totalRequests).toBe(40)

    const m3 = aggregateMetrics(nodes, states, outflow, m2.totalRequests)
    expect(m3.totalRequests).toBe(60)
  })

  it('totalRequests never decreases even when RPS drops', () => {
    const nodes = [makeClient('c1', 100)]
    const states = { c1: makeState('c1', 0, 0) }

    const highFlow = new Map([['c1', 500]])
    const m1 = aggregateMetrics(nodes, states, highFlow, 0)
    expect(m1.totalRequests).toBe(100) // 500 * 0.2

    const lowFlow = new Map([['c1', 50]])
    const m2 = aggregateMetrics(nodes, states, lowFlow, m1.totalRequests)
    expect(m2.totalRequests).toBe(110) // 100 + 50*0.2
    expect(m2.totalRequests).toBeGreaterThan(m1.totalRequests)
  })

  it('throughput sums only client outflows', () => {
    const nodes = [makeClient('c1', 200), makeServer('s1')]
    const outflow = new Map([['c1', 200], ['s1', 180]])
    const states = {
      c1: makeState('c1', 0, 0),
      s1: makeState('s1', 18, 0),
    }
    const m = aggregateMetrics(nodes, states, outflow, 0)
    expect(m.throughput).toBe(200) // only c1, not s1
  })

  it('error rate averages across all nodes', () => {
    const nodes = [makeClient('c1', 100), makeServer('s1')]
    const outflow = new Map([['c1', 100]])
    const states = {
      c1: makeState('c1', 0, 0),
      s1: makeState('s1', 50, 0.4),
    }
    const m = aggregateMetrics(nodes, states, outflow, 0)
    expect(m.errorRate).toBeCloseTo(0.2) // (0 + 0.4) / 2
  })

  it('handles empty topology gracefully', () => {
    const m = aggregateMetrics([], {}, new Map(), 0)
    expect(m.throughput).toBe(0)
    expect(m.errorRate).toBe(0)
    expect(m.totalRequests).toBe(0)
  })
})
