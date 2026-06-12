import { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { X, FolderOpen, Trash2, Plus, Loader2, FileText } from 'lucide-react'
import { diagramStore } from '../../stores/DiagramStore'
import { uiStore } from '../../stores/UIStore'
import { graphStore } from '../../stores/GraphStore'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function guardUnsaved(proceed: () => void) {
  if (graphStore.isDirty) {
    uiStore.openConfirm(
      'Unsaved changes',
      'You have unsaved changes. Discard them and continue?',
      proceed,
      true,
    )
  } else {
    proceed()
  }
}

const DiagramsModal = observer(() => {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [loadingId,  setLoadingId]  = useState<string | null>(null)

  useEffect(() => {
    if (diagramStore.listOpen) diagramStore.fetchList()
  }, [diagramStore.listOpen])

  if (!diagramStore.listOpen) return null

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try { await diagramStore.deleteDiagram(id) }
    finally { setDeletingId(null) }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) diagramStore.closeList() }}
    >
      <div className="bg-app-surface border border-app-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden flex flex-col max-h-[80vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-app-border shrink-0">
          <div className="flex items-center gap-2">
            <FolderOpen size={16} className="text-app-accent" />
            <span className="text-sm font-semibold text-app-text">My Diagrams</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => guardUnsaved(() => { diagramStore.newDiagram(); uiStore.setLoadedTemplate(null) })}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-app-accent hover:bg-app-accent-dim text-white transition-colors"
            >
              <Plus size={12} strokeWidth={2.5} />
              New
            </button>
            <button onClick={() => diagramStore.closeList()} className="text-app-text-3 hover:text-app-text transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {diagramStore.isLoadingList ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={20} className="animate-spin text-app-text-3" />
            </div>
          ) : diagramStore.diagrams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <FileText size={32} className="text-app-text-3 opacity-40" />
              <p className="text-sm text-app-text-3">No saved diagrams yet</p>
              <button
                onClick={() => guardUnsaved(() => { diagramStore.newDiagram(); uiStore.setLoadedTemplate(null) })}
                className="text-xs text-app-accent hover:underline"
              >
                Start with a blank canvas
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-app-border">
              {diagramStore.diagrams.map(d => (
                <li key={d.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-app-elevated transition-colors group">
                  <FileText size={15} className="text-app-text-3 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-app-text font-medium truncate">{d.name}</p>
                    <p className="text-[11px] text-app-text-3 mt-0.5">
                      {diagramStore.currentDiagramId === d.id && (
                        <span className="text-app-accent mr-1.5">● open</span>
                      )}
                      {formatDate(d.updatedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={async () => {
                        guardUnsaved(async () => {
                          setLoadingId(d.id)
                          try { await diagramStore.loadDiagram(d.id) }
                          finally { setLoadingId(null) }
                        })
                      }}
                      disabled={loadingId === d.id}
                      className="text-xs px-2.5 py-1 rounded-md border border-app-border text-app-text-2 hover:text-app-text hover:border-app-accent/50 transition-colors disabled:opacity-40 flex items-center gap-1"
                    >
                      {loadingId === d.id
                        ? <Loader2 size={11} className="animate-spin" />
                        : 'Open'}
                    </button>
                    <button
                      onClick={() => handleDelete(d.id)}
                      disabled={deletingId === d.id}
                      className="p-1 rounded-md text-app-text-3 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                    >
                      {deletingId === d.id
                        ? <Loader2 size={13} className="animate-spin" />
                        : <Trash2 size={13} strokeWidth={1.8} />
                      }
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
})

export default DiagramsModal
