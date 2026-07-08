import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { runInAction } from 'mobx'
import { graphStore } from '../stores/GraphStore'
import { NodeType } from '../types/topology'

let fakeTime = 10000

function tick(ms = 500) {
  fakeTime += ms
  vi.spyOn(Date, 'now').mockReturnValue(fakeTime)
}

function addTestNode(id?: string) {
  tick()
  return runInAction(() => graphStore.addNode({
    id,
    label: 'Test',
    position: { x: 0, y: 0 },
    nodeType: NodeType.ApiServer,
    config: { capacity: 1000, latencyMs: 50, failureRate: 0, timeoutMs: 5000 },
  } as any))
}

beforeEach(() => {
  fakeTime = 10000
  vi.spyOn(Date, 'now').mockReturnValue(fakeTime)
  runInAction(() => graphStore.clearCanvas())
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('undo/redo', () => {
  it('undo after addNode removes the node', () => {
    const id = addTestNode('n1')
    expect(graphStore.nodes.has(id)).toBe(true)
    runInAction(() => graphStore.undo())
    expect(graphStore.nodes.has(id)).toBe(false)
  })

  it('redo after undo restores the node', () => {
    const id = addTestNode('n1')
    runInAction(() => graphStore.undo())
    expect(graphStore.nodes.has(id)).toBe(false)
    runInAction(() => graphStore.redo())
    expect(graphStore.nodes.has(id)).toBe(true)
  })

  it('undo after removeNode restores node and its edges', () => {
    const n1 = addTestNode('n1')
    const n2 = addTestNode('n2')
    tick()
    const edgeId = runInAction(() => graphStore.connectNodes(n1, n2))
    expect(graphStore.edges.has(edgeId)).toBe(true)

    tick()
    runInAction(() => graphStore.removeNode(n1))
    expect(graphStore.nodes.has(n1)).toBe(false)
    expect(graphStore.edges.has(edgeId)).toBe(false)

    runInAction(() => graphStore.undo())
    expect(graphStore.nodes.has(n1)).toBe(true)
    expect(graphStore.edges.has(edgeId)).toBe(true)
  })

  it('undo after connectNodes removes the edge', () => {
    const n1 = addTestNode('n1')
    const n2 = addTestNode('n2')
    tick()
    const edgeId = runInAction(() => graphStore.connectNodes(n1, n2))
    expect(graphStore.edges.has(edgeId)).toBe(true)

    runInAction(() => graphStore.undo())
    expect(graphStore.edges.has(edgeId)).toBe(false)
    expect(graphStore.nodes.has(n1)).toBe(true)
    expect(graphStore.nodes.has(n2)).toBe(true)
  })

  it('undo reverts config changes', () => {
    const id = addTestNode('n1')
    tick()
    runInAction(() => graphStore.updateNodeConfig(id, { config: { capacity: 5000, latencyMs: 50, failureRate: 0, timeoutMs: 5000 } } as any))
    expect((graphStore.nodes.get(id)!.config as any).capacity).toBe(5000)

    runInAction(() => graphStore.undo())
    expect((graphStore.nodes.get(id)!.config as any).capacity).toBe(1000)
  })

  it('multiple undos walk back multiple actions', () => {
    addTestNode('n1')
    addTestNode('n2')
    addTestNode('n3')
    expect(graphStore.nodes.size).toBe(3)

    runInAction(() => graphStore.undo())
    expect(graphStore.nodes.size).toBe(2)
    runInAction(() => graphStore.undo())
    expect(graphStore.nodes.size).toBe(1)
    runInAction(() => graphStore.undo())
    expect(graphStore.nodes.size).toBe(0)
  })

  it('undo on empty stack is a no-op', () => {
    expect(graphStore.canUndo).toBe(false)
    runInAction(() => graphStore.undo())
    expect(graphStore.nodes.size).toBe(0)
  })

  it('redo on empty stack is a no-op', () => {
    expect(graphStore.canRedo).toBe(false)
    runInAction(() => graphStore.redo())
  })

  it('new action after undo clears redo stack', () => {
    addTestNode('n1')
    expect(graphStore.canUndo).toBe(true)
    runInAction(() => graphStore.undo())
    expect(graphStore.canRedo).toBe(true)

    addTestNode('n2')
    expect(graphStore.canRedo).toBe(false)
  })

  it('loadTopology resets undo/redo history', () => {
    addTestNode('n1')
    addTestNode('n2')
    expect(graphStore.canUndo).toBe(true)

    runInAction(() => graphStore.loadTopology({ version: '1.0', nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } }))
    expect(graphStore.canUndo).toBe(false)
    expect(graphStore.canRedo).toBe(false)
  })

  it('clearCanvas resets undo/redo history', () => {
    addTestNode('n1')
    expect(graphStore.canUndo).toBe(true)

    runInAction(() => graphStore.clearCanvas())
    expect(graphStore.canUndo).toBe(false)
    expect(graphStore.canRedo).toBe(false)
  })

  it('canUndo/canRedo flags track stack state', () => {
    expect(graphStore.canUndo).toBe(false)
    expect(graphStore.canRedo).toBe(false)

    addTestNode('n1')
    expect(graphStore.canUndo).toBe(true)
    expect(graphStore.canRedo).toBe(false)

    runInAction(() => graphStore.undo())
    expect(graphStore.canUndo).toBe(false)
    expect(graphStore.canRedo).toBe(true)

    runInAction(() => graphStore.redo())
    expect(graphStore.canUndo).toBe(true)
    expect(graphStore.canRedo).toBe(false)
  })

  it('rapid edits within 300ms batch into one undo step', () => {
    addTestNode('n1')

    tick() // fresh window
    runInAction(() => graphStore.updateNodeConfig('n1', { config: { capacity: 2000, latencyMs: 50, failureRate: 0, timeoutMs: 5000 } } as any))
    tick(100)
    runInAction(() => graphStore.updateNodeConfig('n1', { config: { capacity: 3000, latencyMs: 50, failureRate: 0, timeoutMs: 5000 } } as any))
    tick(100)
    runInAction(() => graphStore.updateNodeConfig('n1', { config: { capacity: 5000, latencyMs: 50, failureRate: 0, timeoutMs: 5000 } } as any))

    expect((graphStore.nodes.get('n1')!.config as any).capacity).toBe(5000)
    runInAction(() => graphStore.undo())
    expect((graphStore.nodes.get('n1')!.config as any).capacity).toBe(1000)
  })

  it('disconnectEdge is undoable', () => {
    const n1 = addTestNode('n1')
    const n2 = addTestNode('n2')
    tick()
    const edgeId = runInAction(() => graphStore.connectNodes(n1, n2))

    tick()
    runInAction(() => graphStore.disconnectEdge(edgeId))
    expect(graphStore.edges.has(edgeId)).toBe(false)

    runInAction(() => graphStore.undo())
    expect(graphStore.edges.has(edgeId)).toBe(true)
  })

  it('selection is cleared if undone node no longer exists', () => {
    const id = addTestNode('n1')
    addTestNode('n2')
    runInAction(() => graphStore.selectNode(id))
    expect(graphStore.selectedNodeId).toBe(id)

    runInAction(() => graphStore.undo()) // undo n2 — n1 still exists
    expect(graphStore.selectedNodeId).toBe(id)

    runInAction(() => graphStore.undo()) // undo n1 — n1 gone
    expect(graphStore.selectedNodeId).toBe(null)
  })
})
