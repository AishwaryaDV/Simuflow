import { useEffect } from 'react'
import { autorun } from 'mobx'
import { graphStore } from '../stores/GraphStore'
import type { TopologySchema } from '../types/topology'

const STORAGE_KEY = 'simuflow:topology'

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
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist on every topology mutation
  useEffect(() => {
    const dispose = autorun(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(graphStore.topology))
    })
    return dispose
  }, [])
}
