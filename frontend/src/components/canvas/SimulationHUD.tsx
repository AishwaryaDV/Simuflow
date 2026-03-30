import { useState, useRef, useCallback, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { simulationStore } from '../../stores/SimulationStore'
import { SimulationStatus } from '../../types/topology'

function formatRps(rps: number): string {
  if (rps >= 1000) return `${(rps / 1000).toFixed(1)}k`
  return Math.round(rps).toString()
}

function formatTotal(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return Math.round(n).toString()
}

function formatElapsed(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={`text-sm font-bold tabular-nums leading-none ${accent ? 'text-app-accent' : 'text-app-text'}`}>
        {value}
      </span>
      <span className="text-[9px] font-medium uppercase tracking-widest text-app-text-3">{label}</span>
    </div>
  )
}

const SimulationHUD = observer(() => {
  const { status, globalMetrics, elapsedSeconds, speed, isRunning } = simulationStore

  const [pos, setPos] = useState({ x: -1, y: -1 }) // -1 = use default CSS positioning
  const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)
  const hudRef = useRef<HTMLDivElement>(null)

  // Reset position when simulation stops so it returns to default corner
  useEffect(() => {
    if (status === SimulationStatus.Idle) setPos({ x: -1, y: -1 })
  }, [status])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const rect = hudRef.current!.getBoundingClientRect()
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: rect.left,
      origY: rect.top,
    }

    const onMove = (ev: MouseEvent) => {
      if (!dragState.current) return
      setPos({
        x: dragState.current.origX + (ev.clientX - dragState.current.startX),
        y: dragState.current.origY + (ev.clientY - dragState.current.startY),
      })
    }
    const onUp = () => {
      dragState.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  if (status === SimulationStatus.Idle) return null

  const isPaused = status === SimulationStatus.Paused
  const isDragged = pos.x !== -1

  return (
    <div
      ref={hudRef}
      onMouseDown={onMouseDown}
      style={isDragged ? { position: 'fixed', left: pos.x, top: pos.y, right: 'auto' } : undefined}
      className={`${isDragged ? '' : 'absolute top-3 right-3'} z-20 cursor-grab active:cursor-grabbing select-none`}
    >
      <div className="flex items-center gap-3 bg-app-surface/90 backdrop-blur-sm border border-app-border rounded-xl px-3.5 py-2 shadow-lg shadow-black/30">

        {/* Status dot */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isRunning ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`} />
          <span className="text-[9px] font-semibold uppercase tracking-widest text-app-text-3">
            {isPaused ? 'Paused' : 'Live'}
          </span>
        </div>

        <div className="w-px h-5 bg-app-border" />

        <Stat label="RPS" value={formatRps(globalMetrics.throughput)} accent />
        <Stat label="Requests" value={formatTotal(globalMetrics.totalRequests)} />
        <Stat label="Elapsed" value={formatElapsed(elapsedSeconds)} />
        <Stat label="Speed" value={`${speed}×`} />

        {/* Error rate — only show when non-zero */}
        {globalMetrics.errorRate > 0.001 && (
          <>
            <div className="w-px h-5 bg-app-border" />
            <Stat label="Errors" value={`${(globalMetrics.errorRate * 100).toFixed(1)}%`} />
          </>
        )}
      </div>
    </div>
  )
})

export default SimulationHUD
