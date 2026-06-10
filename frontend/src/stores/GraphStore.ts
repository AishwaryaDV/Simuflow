import { makeObservable, observable, action, computed } from 'mobx'
import { nanoid } from 'nanoid'
import type { SimNode, SimEdge, StructuralNode, TopologySchema, CanvasViewport } from '../types/topology'
import { TOPOLOGY_VERSION } from '../types/topology'

class GraphStore {
  nodes:           Map<string, SimNode>        = new Map()
  edges:           Map<string, SimEdge>        = new Map()
  structuralNodes: Map<string, StructuralNode> = new Map()
  selectedNodeId:  string | null = null
  selectedEdgeId:  string | null = null
  diagramId:       string | null = null
  diagramName:     string        = 'Untitled Diagram'
  isDirty:         boolean       = false
  viewport:        CanvasViewport = { x: 0, y: 0, zoom: 1 }
  loadKey:         number         = 0

  constructor() {
    makeObservable(this, {
      nodes:                observable,
      edges:                observable,
      structuralNodes:      observable,
      selectedNodeId:       observable,
      selectedEdgeId:       observable,
      diagramId:            observable,
      diagramName:          observable,
      isDirty:              observable,
      viewport:             observable,
      loadKey:              observable,
      nodeCount:            computed,
      edgeCount:            computed,
      sourceNodes:          computed,
      terminalNodes:        computed,
      topology:             computed,
      addNode:              action,
      removeNode:           action,
      updateNodeConfig:     action,
      connectNodes:         action,
      disconnectEdge:       action,
      updateEdge:           action,
      addStructuralNode:    action,
      removeStructuralNode: action,
      updateStructuralNode: action,
      selectNode:           action,
      selectEdge:           action,
      setName:              action,
      setViewport:          action,
      loadTopology:         action,
      clearCanvas:          action,
      markSaved:            action,
    })
  }

  // ─── Computed ──────────────────────────────────────────────────────────────

  get nodeCount() {
    return this.nodes.size
  }

  get edgeCount() {
    return this.edges.size
  }

  get sourceNodes(): SimNode[] {
    const targeted = new Set(Array.from(this.edges.values()).map(e => e.targetId))
    return Array.from(this.nodes.values()).filter(n => !targeted.has(n.id))
  }

  get terminalNodes(): SimNode[] {
    const sourced = new Set(Array.from(this.edges.values()).map(e => e.sourceId))
    return Array.from(this.nodes.values()).filter(n => !sourced.has(n.id))
  }

  get topology(): TopologySchema {
    return {
      version:        TOPOLOGY_VERSION,
      nodes:          Array.from(this.nodes.values()),
      edges:          Array.from(this.edges.values()),
      structuralNodes: Array.from(this.structuralNodes.values()),
      viewport:       this.viewport,
    }
  }

  // ─── Simulation node actions ───────────────────────────────────────────────

  addNode(node: Omit<SimNode, 'id'> & { id?: string }): string {
    const id = node.id ?? nanoid()
    this.nodes.set(id, { ...node, id } as SimNode)
    this.isDirty = true
    return id
  }

  removeNode(id: string) {
    this.nodes.delete(id)
    for (const [edgeId, edge] of this.edges) {
      if (edge.sourceId === id || edge.targetId === id) this.edges.delete(edgeId)
    }
    if (this.selectedNodeId === id) this.selectedNodeId = null
    this.isDirty = true
  }

  updateNodeConfig(id: string, patch: Partial<SimNode>) {
    const node = this.nodes.get(id)
    if (!node) return
    this.nodes.set(id, { ...node, ...patch } as SimNode)
    this.isDirty = true
  }

  connectNodes(sourceId: string, targetId: string, label?: string): string {
    const id = nanoid()
    this.edges.set(id, { id, sourceId, targetId, label })
    this.isDirty = true
    return id
  }

  disconnectEdge(id: string) {
    this.edges.delete(id)
    if (this.selectedEdgeId === id) this.selectedEdgeId = null
    this.isDirty = true
  }

  updateEdge(id: string, patch: Partial<SimEdge>) {
    const edge = this.edges.get(id)
    if (!edge) return
    this.edges.set(id, { ...edge, ...patch })
    this.isDirty = true
  }

  // ─── Structural node actions ───────────────────────────────────────────────

  addStructuralNode(node: Omit<StructuralNode, 'id'> & { id?: string }): string {
    const id = node.id ?? nanoid()
    this.structuralNodes.set(id, { ...node, id } as StructuralNode)
    this.isDirty = true
    return id
  }

  removeStructuralNode(id: string) {
    this.structuralNodes.delete(id)
    if (this.selectedNodeId === id) this.selectedNodeId = null
    this.isDirty = true
  }

  updateStructuralNode(id: string, patch: Partial<StructuralNode>) {
    const node = this.structuralNodes.get(id)
    if (!node) return
    this.structuralNodes.set(id, { ...node, ...patch })
    this.isDirty = true
  }

  // ─── Shared actions ────────────────────────────────────────────────────────

  selectNode(id: string | null) {
    this.selectedNodeId = id
    if (id) this.selectedEdgeId = null
  }

  selectEdge(id: string | null) {
    this.selectedEdgeId = id
    if (id) this.selectedNodeId = null
  }

  setName(name: string) {
    this.diagramName = name
    this.isDirty = true
  }

  setViewport(viewport: CanvasViewport) {
    this.viewport = viewport
  }

  loadTopology(topology: TopologySchema, id?: string, name?: string) {
    this.nodes.clear()
    this.edges.clear()
    this.structuralNodes.clear()
    for (const node of topology.nodes) this.nodes.set(node.id, node)
    for (const edge of topology.edges) this.edges.set(edge.id, edge)
    // structuralNodes may be absent in v1.0 topologies
    for (const sn of topology.structuralNodes ?? []) this.structuralNodes.set(sn.id, sn)
    this.viewport       = topology.viewport
    this.selectedNodeId = null
    this.diagramId      = id ?? null
    this.diagramName    = name ?? 'Untitled Diagram'
    this.isDirty        = false
    this.loadKey        += 1
  }

  clearCanvas() {
    this.nodes.clear()
    this.edges.clear()
    this.structuralNodes.clear()
    this.selectedNodeId = null
    this.diagramId      = null
    this.isDirty        = false
    this.loadKey        += 1
  }

  markSaved(id: string) {
    this.diagramId = id
    this.isDirty   = false
  }

  nodesWithinBounds(x: number, y: number, w: number, h: number): string[] {
    const ids: string[] = []
    for (const node of this.nodes.values()) {
      if (
        node.position.x >= x && node.position.x <= x + w &&
        node.position.y >= y && node.position.y <= y + h
      ) ids.push(node.id)
    }
    return ids
  }
}

export const graphStore = new GraphStore()
