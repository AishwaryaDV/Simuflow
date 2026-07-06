import { useEffect } from 'react'
import { autorun, runInAction } from 'mobx'
import { graphStore } from '../stores/GraphStore'
import { diagramStore } from '../stores/DiagramStore'
import type { TopologySchema } from '../types/topology'

const STORAGE_KEY = 'simuflow:topology'
const META_KEY    = 'simuflow:diagram-meta'

/** Rehydrates canvas from localStorage on mount and auto-saves on every topology change. */
export function useLocalStoragePersistence() {
  // Rehydrate once on mount — only if there is stored data
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    try {
      const topology: TopologySchema = JSON.parse(raw)
      if (Array.isArray(topology.nodes) && Array.isArray(topology.edges)) {
        graphStore.loadTopology(topology)
        // Restore diagram identity so Save updates the same record after a
        // refresh instead of creating an "Untitled Diagram" duplicate.
        const metaRaw = localStorage.getItem(META_KEY)
        if (metaRaw) {
          const meta = JSON.parse(metaRaw) as { id?: string | null; name?: string; isDirty?: boolean }
          runInAction(() => {
            if (meta.name) graphStore.diagramName = meta.name
            graphStore.isDirty = !!meta.isDirty
            diagramStore.setCurrentId(meta.id ?? null)
          })
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(META_KEY)
    }
  }, [])

  // Persist on every topology / identity mutation
  useEffect(() => {
    const dispose = autorun(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(graphStore.topology))
      localStorage.setItem(META_KEY, JSON.stringify({
        id:      diagramStore.currentDiagramId,
        name:    graphStore.diagramName,
        isDirty: graphStore.isDirty,
      }))
    })
    return dispose
  }, [])
}
