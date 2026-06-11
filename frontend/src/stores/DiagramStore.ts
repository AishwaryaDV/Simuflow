import { makeObservable, observable, action, runInAction } from 'mobx'
import { api, type DiagramSummary } from '../lib/api'
import { graphStore } from './GraphStore'
import { TOPOLOGY_VERSION, type TopologySchema } from '../types/topology'

class DiagramStore {
  currentDiagramId: string | null = null
  isSaving         = false
  isLoadingList    = false
  listOpen         = false
  diagrams: DiagramSummary[] = []

  constructor() {
    makeObservable(this, {
      currentDiagramId: observable,
      isSaving:         observable,
      isLoadingList:    observable,
      listOpen:         observable,
      diagrams:         observable,
      openList:         action,
      closeList:        action,
      setCurrentId:     action,
    })
  }

  openList() { this.listOpen = true }
  closeList() { this.listOpen = false }
  setCurrentId(id: string | null) { this.currentDiagramId = id }

  private buildTopology(): TopologySchema {
    return {
      version:        TOPOLOGY_VERSION,
      nodes:          Array.from(graphStore.nodes.values()),
      edges:          Array.from(graphStore.edges.values()),
      structuralNodes: Array.from(graphStore.structuralNodes.values()),
      viewport:       graphStore.viewport,
    } as unknown as TopologySchema
  }

  async save(): Promise<void> {
    if (this.isSaving) return
    runInAction(() => { this.isSaving = true })

    try {
      const name     = graphStore.diagramName || 'Untitled Diagram'
      const topology = this.buildTopology()

      if (this.currentDiagramId) {
        await api.diagrams.update(this.currentDiagramId, name, topology)
      } else {
        const diagram = await api.diagrams.create(name, topology)
        runInAction(() => { this.currentDiagramId = diagram.id })
      }
      runInAction(() => { graphStore.isDirty = false })
    } finally {
      runInAction(() => { this.isSaving = false })
    }
  }

  async fetchList(): Promise<void> {
    runInAction(() => { this.isLoadingList = true })
    try {
      const res = await api.diagrams.list()
      runInAction(() => { this.diagrams = res.items })
    } finally {
      runInAction(() => { this.isLoadingList = false })
    }
  }

  async loadDiagram(id: string): Promise<void> {
    const diagram = await api.diagrams.get(id)
    runInAction(() => {
      graphStore.loadTopology(diagram.topology as TopologySchema, undefined, diagram.name)
      this.currentDiagramId = diagram.id
      this.listOpen = false
    })
  }

  async deleteDiagram(id: string): Promise<void> {
    await api.diagrams.delete(id)
    runInAction(() => {
      this.diagrams = this.diagrams.filter(d => d.id !== id)
      if (this.currentDiagramId === id) this.currentDiagramId = null
    })
  }

  newDiagram(): void {
    graphStore.clearCanvas()
    runInAction(() => {
      this.currentDiagramId = null
      this.listOpen = false
    })
  }
}

export const diagramStore = new DiagramStore()
