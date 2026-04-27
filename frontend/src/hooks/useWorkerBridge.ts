/**
 * useWorkerBridge
 * Mounts the simulation worker, wires messages to SimulationStore.
 * Mount this once in WorkspaceLayout.
 */
import { useEffect, useRef } from 'react'
import { runInAction } from 'mobx'
import { simulationStore } from '../stores/SimulationStore'
import { graphStore } from '../stores/GraphStore'
import type { WorkerOutboundMessage } from '../types/topology'

export function useWorkerBridge() {
  const workerRef = useRef<Worker | null>(null)

  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/simulation.worker.ts', import.meta.url),
      { type: 'module' },
    )
    workerRef.current = worker

    worker.onmessage = (e: MessageEvent<WorkerOutboundMessage>) => {
      const msg = e.data
      if (msg.type === 'FRAME') {
        runInAction(() => simulationStore.absorbFrame(msg.frame))
      } else if (msg.type === 'ERROR') {
        console.error('[SimWorker]', msg.message)
      }
    }

    worker.onerror = (err) => {
      console.error('[SimWorker] uncaught error', err)
    }

    // Expose controls on simulationStore
    simulationStore._bridge = {
      start:     () => {
        const topo = JSON.parse(JSON.stringify(graphStore.topology))
        worker.postMessage({ type: 'START', topology: topo, speed: simulationStore.speed })
      },
      pause:          () => worker.postMessage({ type: 'PAUSE' }),
      resume:         () => worker.postMessage({ type: 'RESUME' }),
      stop:           () => worker.postMessage({ type: 'STOP' }),
      setSpeed:       (s: number) => worker.postMessage({ type: 'SET_SPEED', speed: s }),
      activateChaos:  (scenario) => worker.postMessage({ type: 'ACTIVATE_CHAOS', scenario }),
      deactivateChaos:(instanceId) => worker.postMessage({ type: 'DEACTIVATE_CHAOS', instanceId }),
    }

    return () => {
      worker.postMessage({ type: 'STOP' })
      worker.terminate()
      workerRef.current = null
      simulationStore._bridge = null
    }
  }, [])
}
