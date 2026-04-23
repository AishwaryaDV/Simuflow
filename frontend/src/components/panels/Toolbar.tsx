import { useCallback } from 'react'
import { observer } from 'mobx-react-lite'
import { runInAction } from 'mobx'
import { graphStore } from '../../stores/GraphStore'
import { simulationStore } from '../../stores/SimulationStore'
import { validationStore } from '../../stores/ValidationStore'
import { uiStore } from '../../stores/UIStore'
import { SimulationStatus } from '../../types/topology'
import { LayoutTemplate, Trash2, Play, Pause, Square, ChevronDown } from 'lucide-react'

const SPEEDS: { label: string; value: 0.25 | 0.5 | 1 | 2 | 4 }[] = [
  { label: '0.25×', value: 0.25 },
  { label: '0.5×',  value: 0.5  },
  { label: '1×',    value: 1    },
  { label: '2×',    value: 2    },
  { label: '4×',    value: 4    },
]

function formatElapsed(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

const Toolbar = observer(() => {
  const { status, elapsedSeconds, speed, isRunning } = simulationStore
  const isIdle   = status === SimulationStatus.Idle
  const isPaused = status === SimulationStatus.Paused

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    runInAction(() => graphStore.setName(e.target.value))
  }, [])

  const handleClear = useCallback(() => {
    if (graphStore.nodeCount === 0) return
    runInAction(() => uiStore.openConfirm(
      'Reset canvas',
      'This will clear all nodes and edges. This cannot be undone.',
      () => {
        localStorage.removeItem('simuflow:template-slug')
        runInAction(() => {
          if (!isIdle) simulationStore.stop()
          graphStore.clearCanvas()
          uiStore.setLoadedTemplate(null)
          validationStore.reset()
        })
      },
    ))
  }, [isIdle])

  const handlePlay = useCallback(() => {
    if (graphStore.nodeCount === 0) return
    if (isPaused) {
      runInAction(() => simulationStore.resume())
      return
    }
    // Run topology validation before starting — shows error modal or warning sheet if needed
    validationStore.validate(() => runInAction(() => simulationStore.start()))
  }, [isPaused])

  const handlePause  = useCallback(() => runInAction(() => simulationStore.pause()), [])
  const handleStop   = useCallback(() => runInAction(() => simulationStore.stop()),  [])

  return (
    <header className="h-12 flex items-center px-4 gap-3 bg-app-surface border-b border-app-border shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-6 h-6 rounded-md bg-app-accent flex items-center justify-center text-white text-xs font-bold select-none">
          S
        </div>
        <span className="text-sm font-semibold text-app-text hidden sm:block">SimuFlow</span>
      </div>

      <div className="w-px h-5 bg-app-border shrink-0" />

      {/* Diagram name */}
      <input
        type="text"
        value={graphStore.diagramName}
        onChange={handleNameChange}
        placeholder="Untitled diagram"
        className="text-sm font-medium text-app-text bg-transparent border-none outline-none focus:bg-app-elevated focus:ring-1 focus:ring-app-accent rounded px-2 py-1 min-w-0 w-40 truncate placeholder:text-app-text-3"
        maxLength={80}
        aria-label="Diagram name"
      />

      {graphStore.isDirty && (
        <span className="text-[10px] font-medium text-app-text-3 shrink-0">unsaved</span>
      )}

      <div className="flex-1" />

      {/* ── Simulation controls ────────────────────────────── */}
      <div className="flex items-center gap-1.5">

        {/* Elapsed + status badge */}
        {!isIdle && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-app-elevated border border-app-border">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isRunning ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`} />
            <span className="text-[11px] font-mono text-app-text-2 tabular-nums">
              {formatElapsed(elapsedSeconds)}
            </span>
          </div>
        )}

        {/* Speed picker */}
        {!isIdle && (
          <div className="relative flex items-center">
            <select
              value={speed}
              onChange={e => runInAction(() => simulationStore.setSpeed(Number(e.target.value) as typeof speed))}
              className="appearance-none text-[11px] font-medium text-app-text-2 bg-app-elevated border border-app-border rounded-lg pl-2 pr-5 py-1 focus:outline-none focus:ring-1 focus:ring-app-accent cursor-pointer"
            >
              {SPEEDS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <ChevronDown size={10} className="absolute right-1.5 text-app-text-3 pointer-events-none" />
          </div>
        )}

        {/* Play / Resume */}
        {(isIdle || isPaused) && (
          <button
            onClick={handlePlay}
            disabled={graphStore.nodeCount === 0}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-app-accent hover:bg-app-accent-dim text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
            title={isPaused ? 'Resume simulation' : 'Start simulation'}
          >
            <Play size={12} strokeWidth={2.5} />
            <span>{isPaused ? 'Resume' : 'Simulate'}</span>
          </button>
        )}

        {/* Pause */}
        {isRunning && (
          <button
            onClick={handlePause}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-orange-500/60 text-orange-400 hover:bg-orange-500/10 transition-colors"
            title="Pause"
          >
            <Pause size={12} strokeWidth={2} />
            <span>Pause</span>
          </button>
        )}

        {/* Stop */}
        {!isIdle && (
          <button
            onClick={handleStop}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-red-500/60 text-red-400 hover:bg-red-500/10 transition-colors"
            title="Stop and reset"
          >
            <Square size={11} strokeWidth={2} />
            <span>Stop</span>
          </button>
        )}
      </div>

      <div className="w-px h-5 bg-app-border shrink-0" />

      {/* Templates */}
      <button
        onClick={() => runInAction(() => uiStore.showTemplatesList())}
        className={[
          'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors',
          uiStore.panelState.templates
            ? 'border-app-accent/40 text-app-accent bg-app-accent/10'
            : 'border-app-border/40 text-app-text-2 hover:text-app-text',
        ].join(' ')}
        title="Browse templates"
      >
        <LayoutTemplate size={13} strokeWidth={1.8} />
        <span className="hidden sm:inline">Templates</span>
      </button>

      {/* Reset */}
      <button
        onClick={handleClear}
        disabled={graphStore.nodeCount === 0}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        title="Reset canvas"
      >
        <Trash2 size={13} strokeWidth={1.8} />
        <span className="hidden sm:inline">Reset</span>
      </button>
    </header>
  )
})

export default Toolbar
