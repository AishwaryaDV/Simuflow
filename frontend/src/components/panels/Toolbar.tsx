import { useCallback } from 'react'
import { observer } from 'mobx-react-lite'
import { runInAction } from 'mobx'
import { graphStore } from '../../stores/GraphStore'

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
    <header className="h-14 flex items-center px-4 gap-4 bg-white border-b border-gray-200 shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center text-white text-sm font-bold">
          S
        </div>
        <span className="text-sm font-semibold text-gray-800 hidden sm:block">SimuFlow</span>
      </div>

      <div className="w-px h-6 bg-gray-200 shrink-0" />

      {/* Editable diagram name */}
      <input
        type="text"
        value={graphStore.diagramName}
        onChange={handleNameChange}
        className="text-sm font-medium text-gray-800 bg-transparent border-none outline-none focus:bg-gray-50 focus:ring-1 focus:ring-indigo-300 rounded px-2 py-1 min-w-0 w-48 truncate"
        maxLength={80}
        aria-label="Diagram name"
      />

      {/* Dirty indicator */}
      {graphStore.isDirty && (
        <span className="text-[10px] font-medium text-gray-400 shrink-0">unsaved</span>
      )}

      <div className="flex-1" />

      {/* Actions */}
      <button
        onClick={handleClear}
        disabled={graphStore.nodeCount === 0}
        className="text-xs px-3 py-1.5 rounded-md border border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Clear
      </button>

      {/* Phase 2: simulation controls will be inserted here */}
    </header>
  )
})

export default Toolbar
