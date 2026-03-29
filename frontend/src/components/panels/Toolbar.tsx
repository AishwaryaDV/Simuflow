import { useCallback } from 'react'
import { observer } from 'mobx-react-lite'
import { runInAction } from 'mobx'
import { graphStore } from '../../stores/GraphStore'
import { LayoutTemplate, Trash2 } from 'lucide-react'

const Toolbar = observer(() => {
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    runInAction(() => graphStore.setName(e.target.value))
  }, [])

  const handleClear = useCallback(() => {
    if (graphStore.nodeCount === 0) return
    if (!confirm('Clear the canvas? This cannot be undone.')) return
    runInAction(() => graphStore.clearCanvas())
  }, [])

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

      {/* Editable diagram name */}
      <input
        type="text"
        value={graphStore.diagramName}
        onChange={handleNameChange}
        placeholder="Untitled diagram"
        className="text-sm font-medium text-app-text bg-transparent border-none outline-none focus:bg-app-elevated focus:ring-1 focus:ring-app-accent rounded px-2 py-1 min-w-0 w-48 truncate placeholder:text-app-text-3"
        maxLength={80}
        aria-label="Diagram name"
      />

      {/* Dirty indicator */}
      {graphStore.isDirty && (
        <span className="text-[10px] font-medium text-app-text-3 shrink-0">unsaved</span>
      )}

      <div className="flex-1" />

      {/* Presets — Phase 2: will open a modal/page */}
      <button
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-app-border text-app-text-2 hover:border-app-accent/60 hover:text-app-text transition-colors"
        title="Load a preset topology"
      >
        <LayoutTemplate size={13} strokeWidth={1.8} />
        <span className="hidden sm:inline">Presets</span>
      </button>

      {/* Clear */}
      <button
        onClick={handleClear}
        disabled={graphStore.nodeCount === 0}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-app-border text-app-text-2 hover:border-red-500/60 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        title="Clear canvas"
      >
        <Trash2 size={13} strokeWidth={1.8} />
        <span className="hidden sm:inline">Clear</span>
      </button>

      {/* Phase 2: simulation controls will be inserted here */}
    </header>
  )
})

export default Toolbar
