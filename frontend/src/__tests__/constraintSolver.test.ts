import { describe, it, expect } from 'vitest'
import { buildChaosModifier, computeNodeFlow, SolverState, healthFrom } from '../workers/constraintSolver'
import { NodeType, NodeHealth, ChaosScenarioId } from '../types/topology'
import type { SimNode, ActiveScenario } from '../types/topology'

function makeScenario(
  scenarioId: string,
  targetNodeIds: string[],
  targetEdgeIds: string[] = [],
  config: Record<string, unknown> = {},
): ActiveScenario {
  return {
    id: 'test-' + scenarioId,
    scenarioId: scenarioId as ChaosScenarioId,
    name: scenarioId,
    tag: scenarioId,
    targetNodeIds,
    targetEdgeIds,
    config,
    activatedAt: Date.now(),
    impactLabel: '',
    severity: 'red',
  }
}

function makeNode(nodeType: NodeType, config: Record<string, unknown>, id = 'n1'): SimNode {
  return { id, label: 'Test', position: { x: 0, y: 0 }, nodeType, config } as SimNode
}

// ── buildChaosModifier ──────────────────────────────────────────────────────

describe('buildChaosModifier', () => {
  it('returns no-op when no scenarios target the node', () => {
    const chaos = new Map<string, ActiveScenario>()
    chaos.set('s1', makeScenario('INFRA_INSTANCE_CRASH', ['other-node']))
    const mod = buildChaosModifier('n1', [], chaos)
    expect(mod.rpsMult).toBe(1)
    expect(mod.failureRate).toBe(-1)
  })

  it('NET_BLACKHOLE silently drops traffic without error', () => {
    const chaos = new Map<string, ActiveScenario>()
    chaos.set('s1', makeScenario('NET_BLACKHOLE', ['n1']))
    const mod = buildChaosModifier('n1', [], chaos)
    expect(mod.rpsMult).toBe(0)
    expect(mod.failureRate).toBe(-1) // not 1.0 — silent drop
  })

  it('INFRA_INSTANCE_CRASH sets 100% failure', () => {
    const chaos = new Map<string, ActiveScenario>()
    chaos.set('s1', makeScenario('INFRA_INSTANCE_CRASH', ['n1']))
    const mod = buildChaosModifier('n1', [], chaos)
    expect(mod.rpsMult).toBe(0)
    expect(mod.failureRate).toBe(1.0)
  })

  it('APP_GC_PAUSE freezes node during pause ticks', () => {
    const chaos = new Map<string, ActiveScenario>()
    chaos.set('s1', makeScenario('APP_GC_PAUSE', ['n1'], [], { value: 500 }))
    // periodTicks = round(500/200) = 3, pauseTicks = ceil(3*0.2) = 1
    // tick 0 → pause phase (0 % 3 = 0 < 1)
    const paused = buildChaosModifier('n1', [], chaos, 0)
    expect(paused.rpsMult).toBe(0)
    expect(paused.utilFloor).toBe(1.0)
    // tick 1 → normal phase (1 % 3 = 1, not < 1)
    const normal = buildChaosModifier('n1', [], chaos, 1)
    expect(normal.rpsMult).toBe(1)
  })

  it('TRAFFIC_PAYLOAD_EXPLOSION amplifies RPS and adds latency', () => {
    const chaos = new Map<string, ActiveScenario>()
    chaos.set('s1', makeScenario('TRAFFIC_PAYLOAD_EXPLOSION', ['n1'], [], { multiplier: 3 }))
    const mod = buildChaosModifier('n1', [], chaos)
    expect(mod.rpsMult).toBe(3)
    expect(mod.latencyAddMs).toBe(30)
  })

  it('DATA_CACHE_PERSISTENCE overrides hit rate to 0 and adds latency', () => {
    const chaos = new Map<string, ActiveScenario>()
    chaos.set('s1', makeScenario('DATA_CACHE_PERSISTENCE', ['n1']))
    const mod = buildChaosModifier('n1', [], chaos)
    expect(mod.hitRateOverride).toBe(0)
    expect(mod.latencyAddMs).toBe(300)
  })

  it('edge-targeted NET_LATENCY adds latency via edge ID', () => {
    const chaos = new Map<string, ActiveScenario>()
    chaos.set('s1', makeScenario('NET_LATENCY', [], ['e1'], { value: 200 }))
    const mod = buildChaosModifier('n1', ['e1'], chaos)
    expect(mod.latencyAddMs).toBe(200)
    expect(mod.rpsMult).toBe(1) // latency only, no throughput impact
  })
})

// ── computeNodeFlow ─────────────────────────────────────────────────────────

describe('computeNodeFlow', () => {
  const state = new SolverState()

  it('WAF errorRate reflects failures, not blockRate', () => {
    const waf = makeNode(NodeType.WAF, {
      inspectionCapacity: 10000,
      blockRate: 0.3,
      latencyMs: 5,
      failureRate: 0, // no failures
    })
    const flow = computeNodeFlow(waf, 1000, state, 0, 0.2)
    // blockRate filters 30% of traffic but should not be reported as errors
    expect(flow.outRps).toBe(700) // 1000 * (1 - 0.3)
    expect(flow.errorRate).toBe(0) // no failures = no errors
  })

  it('Cache uses hitRateOverride from chaos', () => {
    const cache = makeNode(NodeType.Cache, {
      capacity: 5000,
      hitRate: 0.8,
      latencyMs: 5,
      failureRate: 0,
      timeoutMs: 1000,
    })
    const mod = { rpsMult: 1, failureRate: -1, utilFloor: -1, latencyAddMs: 0, hitRateOverride: 0 }
    const flow = computeNodeFlow(cache, 1000, state, 0, 0.2, mod)
    // hitRate overridden to 0 → all requests miss → outRps = 1000
    expect(flow.outRps).toBe(1000)
  })

  it('Cache uses normal hitRate without chaos', () => {
    const cache = makeNode(NodeType.Cache, {
      capacity: 5000,
      hitRate: 0.8,
      latencyMs: 5,
      failureRate: 0,
      timeoutMs: 1000,
    })
    const flow = computeNodeFlow(cache, 1000, state, 0, 0.2)
    // 80% hit rate → 20% miss → outRps ≈ 200
    expect(flow.outRps).toBeCloseTo(200, 5)
  })

  it('Client outputs RPS from config', () => {
    const client = makeNode(NodeType.Client, { rps: 500, burst: false })
    const flow = computeNodeFlow(client, 0, state, 0, 0.2)
    expect(flow.outRps).toBe(500)
    expect(flow.errorRate).toBe(0)
  })

  it('ApiServer caps output at capacity', () => {
    const api = makeNode(NodeType.ApiServer, {
      capacity: 100,
      latencyMs: 50,
      failureRate: 0,
      timeoutMs: 5000,
    })
    const flow = computeNodeFlow(api, 500, state, 0, 0.2)
    expect(flow.outRps).toBeLessThanOrEqual(100)
    expect(flow.utilisationPct).toBe(500) // 500/100 * 100
  })
})

// ── healthFrom ──────────────────────────────────────────────────────────────

describe('healthFrom', () => {
  it('returns Healthy below 60% util and low errors', () => {
    expect(healthFrom(50, 0)).toBe(NodeHealth.Healthy)
  })
  it('returns Stressed at 60-90% util', () => {
    expect(healthFrom(75, 0)).toBe(NodeHealth.Stressed)
  })
  it('returns Bottleneck above 90%', () => {
    expect(healthFrom(95, 0)).toBe(NodeHealth.Bottleneck)
  })
  it('returns Failed at high error rate regardless of util', () => {
    expect(healthFrom(10, 0.6)).toBe(NodeHealth.Failed)
  })
})
