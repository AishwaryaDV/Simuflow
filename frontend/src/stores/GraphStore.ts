import { makeObservable, observable, action, computed } from 'mobx'
import { nanoid } from 'nanoid'
import type { SimNode, SimEdge, TopologySchema, CanvasViewport } from '../types/topology'
import { TOPOLOGY_VERSION } from '../types/topology'

class GraphStore {
  nodes: Map<string, SimNode> = new Map()
  edges: Map<string, SimEdge> = new Map()
  selectedNodeId: string | null = null
  diagramId: string | null = null
  diagramName: string = 'Untitled Diagram'
  isDirty: boolean = false
  viewport: CanvasViewport = { x: 0, y: 0, zoom: 1 }

  constructor() {
    makeObservable(this, {
      nodes:          observable,
      edges:          observable,
      selectedNodeId: observable,
      diagramId:      observable,
      diagramName:    observable,
      isDirty:        observable,
      viewport:       observable,
      nodeCount:      computed,
      edgeCount:      computed,
      sourceNodes:    computed,
      terminalNodes:  computed,
      topology:       computed,
      addNode:        action,
      removeNode:     action,
      updateNodeConfig: action,
      connectNodes:   action,
      disconnectEdge: action,
      selectNode:     action,
      setName:        action,
      setViewport:    action,
      loadTopology:   action,
      clearCanvas:    action,
      markSaved:      action,
    })
  }

  // ─── Computed ──────────────────────────────────────────────────────────────

  get nodeCount() {
    return this.nodes.size
  }

  get edgeCount() {
    return this.edges.size
  }

  /** Nodes with no incoming edges — traffic sources */
  get sourceNodes(): SimNode[] {
    const targeted = new Set(Array.from(this.edges.values()).map(e => e.targetId))
    return Array.from(this.nodes.values()).filter(n => !targeted.has(n.id))
  }

  /** Nodes with no outgoing edges — traffic terminals */
  get terminalNodes(): SimNode[] {
    const sourced = new Set(Array.from(this.edges.values()).map(e => e.sourceId))
    return Array.from(this.nodes.values()).filter(n => !sourced.has(n.id))
  }

  /** Full serialisable topology — what gets saved to Supabase */
  get topology(): TopologySchema {
    return {
      version:  TOPOLOGY_VERSION,
      nodes:    Array.from(this.nodes.values()),
      edges:    Array.from(this.edges.values()),
      viewport: this.viewport,
    }
  }

  // ─── Actions ───────────────────────────────────────────────────────────────

  addNode(node: Omit<SimNode, 'id'> & { id?: string }): string {
    const id = node.id ?? nanoid()
    this.nodes.set(id, { ...node, id } as SimNode)
    this.isDirty = true
    return id
  }

  removeNode(id: string) {
    this.nodes.delete(id)
    // Remove all edges connected to this node
    for (const [edgeId, edge] of this.edges) {
      if (edge.sourceId === id || edge.targetId === id) {
        this.edges.delete(edgeId)
      }
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
    this.isDirty = true
  }

  selectNode(id: string | null) {
    this.selectedNodeId = id
  }

  setName(name: string) {
    this.diagramName = name
    this.isDirty = true
  }

  setViewport(viewport: CanvasViewport) {
    this.viewport = viewport
  }

  /** Load a full topology onto the canvas — used by presets and load-from-Supabase */
  loadTopology(topology: TopologySchema, id?: string, name?: string) {
    this.nodes.clear()
    this.edges.clear()
    for (const node of topology.nodes) this.nodes.set(node.id, node)
    for (const edge of topology.edges) this.edges.set(edge.id, edge)
    this.viewport       = topology.viewport
    this.selectedNodeId = null
    this.diagramId      = id ?? null
    this.diagramName    = name ?? 'Untitled Diagram'
    this.isDirty        = false
  }

  clearCanvas() {
    this.nodes.clear()
    this.edges.clear()
    this.selectedNodeId = null
    this.diagramId      = null
    this.isDirty        = false
  }

  markSaved(id: string) {
    this.diagramId = id
    this.isDirty   = false
  }
}

export const graphStore = new GraphStore()
