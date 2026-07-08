import { describe, it, expect } from 'vitest'
import { VALIDATION_RULES } from '../validation/rules'
import { NodeType } from '../types/topology'
import type { SimNode, SimEdge } from '../types/topology'
import type { ValidationContext } from '../validation/types'

function makeNode(id: string, nodeType: NodeType): SimNode {
  const base = { capacity: 1000, latencyMs: 50, failureRate: 0, timeoutMs: 5000 }
  const config = nodeType === NodeType.Client ? { rps: 100, burst: false } : base
  return { id, label: id, position: { x: 0, y: 0 }, nodeType, config } as SimNode
}

function makeEdge(id: string, sourceId: string, targetId: string): SimEdge {
  return { id, sourceId, targetId }
}

function ctx(nodes: SimNode[], edges: SimEdge[]): ValidationContext {
  const map = new Map<string, SimNode>()
  nodes.forEach(n => map.set(n.id, n))
  return { nodes: map, edges }
}

function runRules(context: ValidationContext) {
  return VALIDATION_RULES.flatMap(r => r.check(context))
}

function findIssue(context: ValidationContext, ruleId: string) {
  return runRules(context).find(i => i.ruleId === ruleId)
}

describe('validation rules', () => {
  // ── Cycle detection ─────────────────────────────────────────────────────

  it('cycle is a warning, not an error', () => {
    const a = makeNode('a', NodeType.ApiServer)
    const b = makeNode('b', NodeType.ApiServer)
    const c = makeNode('c', NodeType.Client)
    const edges = [
      makeEdge('e1', 'c', 'a'),
      makeEdge('e2', 'a', 'b'),
      makeEdge('e3', 'b', 'a'), // cycle: a→b→a
    ]
    const issue = findIssue(ctx([c, a, b], edges), 'WARN_CYCLE')
    expect(issue).toBeDefined()
    expect(issue!.severity).toBe('warning')
  })

  it('no cycle warning on acyclic graph', () => {
    const c = makeNode('c', NodeType.Client)
    const a = makeNode('a', NodeType.ApiServer)
    const d = makeNode('d', NodeType.Database)
    const edges = [makeEdge('e1', 'c', 'a'), makeEdge('e2', 'a', 'd')]
    const issue = findIssue(ctx([c, a, d], edges), 'WARN_CYCLE')
    expect(issue).toBeUndefined()
  })

  it('cycle issue includes affected node IDs', () => {
    const c = makeNode('c', NodeType.Client)
    const a = makeNode('a', NodeType.ApiServer)
    const b = makeNode('b', NodeType.ApiServer)
    const edges = [
      makeEdge('e1', 'c', 'a'),
      makeEdge('e2', 'a', 'b'),
      makeEdge('e3', 'b', 'a'),
    ]
    const issue = findIssue(ctx([c, a, b], edges), 'WARN_CYCLE')
    expect(issue!.affectedNodeIds).toContain('a')
    expect(issue!.affectedNodeIds).toContain('b')
    expect(issue!.affectedNodeIds).not.toContain('c') // c is not on the cycle
  })

  // ── No client ───────────────────────────────────────────────────────────

  it('errors when topology has no client', () => {
    const a = makeNode('a', NodeType.ApiServer)
    const issue = findIssue(ctx([a], []), 'ERR_NO_CLIENT')
    expect(issue).toBeDefined()
    expect(issue!.severity).toBe('error')
  })

  it('no error when client exists', () => {
    const c = makeNode('c', NodeType.Client)
    const issue = findIssue(ctx([c], []), 'ERR_NO_CLIENT')
    expect(issue).toBeUndefined()
  })

  // ── Self-loop ───────────────────────────────────────────────────────────

  it('errors on self-loop', () => {
    const c = makeNode('c', NodeType.Client)
    const a = makeNode('a', NodeType.ApiServer)
    const edges = [makeEdge('e1', 'c', 'a'), makeEdge('e2', 'a', 'a')]
    const issue = findIssue(ctx([c, a], edges), 'ERR_SELF_LOOP')
    expect(issue).toBeDefined()
    expect(issue!.severity).toBe('error')
  })

  // ── Isolated node ─────────────────────────────────────────────────────

  it('errors on isolated node (no edges at all)', () => {
    const c = makeNode('c', NodeType.Client)
    const a = makeNode('a', NodeType.ApiServer)
    // both have no edges — both are isolated
    const issues = runRules(ctx([c, a], [])).filter(i => i.ruleId === 'ERR_ISOLATED_NODE')
    expect(issues.length).toBeGreaterThanOrEqual(1)
    const affectedIds = issues.flatMap(i => i.affectedNodeIds)
    expect(affectedIds).toContain('a')
    expect(affectedIds).toContain('c')
  })

  // ── Client with no downstream ─────────────────────────────────────────

  it('warns when client has no outgoing edges', () => {
    const c = makeNode('c', NodeType.Client)
    const issue = findIssue(ctx([c], []), 'WARN_CLIENT_NO_OUTGOING')
    expect(issue).toBeDefined()
    expect(issue!.severity).toBe('warning')
  })

  // ── Clean topology ────────────────────────────────────────────────────

  it('clean Client→API→DB produces no errors', () => {
    const c = makeNode('c', NodeType.Client)
    const a = makeNode('a', NodeType.ApiServer)
    const d = makeNode('d', NodeType.Database)
    const edges = [makeEdge('e1', 'c', 'a'), makeEdge('e2', 'a', 'd')]
    const issues = runRules(ctx([c, a, d], edges))
    const errors = issues.filter(i => i.severity === 'error')
    expect(errors).toHaveLength(0)
  })
})
