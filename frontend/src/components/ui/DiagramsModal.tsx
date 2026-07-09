import { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { ArrowLeft, FolderOpen, Trash2, Plus, Loader2, FileText } from 'lucide-react'
import { diagramStore } from '../../stores/DiagramStore'
import { uiStore } from '../../stores/UIStore'
import { graphStore } from '../../stores/GraphStore'

function formatDate(iso: string) {
  const d = new Date(iso)
  const now = Date.now()
  const diff = now - d.getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
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

  const handleDelete = (id: string, name: string) => {
    uiStore.openConfirm(
      'Delete diagram',
      `"${name}" will be permanently deleted. This cannot be undone.`,
      async () => {
        setDeletingId(id)
        try { await diagramStore.deleteDiagram(id) }
        catch { uiStore.showToast('Failed to delete diagram. Please try again.') }
        finally { setDeletingId(null) }
      },
      true,
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-app-bg flex flex-col">
      <div className="flex-1 flex flex-col max-w-2xl w-full mx-auto overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-app-border shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => diagramStore.closeList()} className="text-app-text-3 hover:text-app-text transition-colors p-1 rounded-lg hover:bg-app-elevated">
              <ArrowLeft size={18} />
            </button>
            <FolderOpen size={16} className="text-app-accent" />
            <span className="text-base font-semibold text-app-text">My Diagrams</span>
          </div>
          <button
            onClick={() => guardUnsaved(() => { diagramStore.newDiagram(); uiStore.setLoadedTemplate(null) })}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-app-accent hover:bg-app-accent-dim text-white transition-colors"
          >
            <Plus size={12} strokeWidth={2.5} />
            New
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {diagramStore.isLoadingList ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={20} className="animate-spin text-app-text-3" />
            </div>
          ) : diagramStore.diagrams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-app-elevated border border-app-border flex items-center justify-center">
                <FileText size={28} className="text-app-text-3 opacity-50" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-app-text-2">No diagrams yet</p>
                <p className="text-xs text-app-text-3 mt-1 max-w-xs leading-relaxed">
                  Create your first diagram by placing components on the canvas and saving your work.
                </p>
              </div>
              <button
                onClick={() => guardUnsaved(() => { diagramStore.newDiagram(); uiStore.setLoadedTemplate(null) })}
                className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg bg-app-accent hover:bg-app-accent-dim text-white transition-colors"
              >
                <Plus size={12} strokeWidth={2.5} />
                New diagram
              </button>
            </div>
          ) : (
            <>
              <div className="px-5 pt-4 pb-2">
                <p className="text-xs text-app-text-3">{diagramStore.diagrams.length} diagram{diagramStore.diagrams.length !== 1 ? 's' : ''}</p>
              </div>
              <ul className="divide-y divide-app-border/60">
                {diagramStore.diagrams.map((d, i) => {
                  const isCurrent = diagramStore.currentDiagramId === d.id
                  return (
                    <li key={d.id}
                      className={`flex items-center gap-3 px-5 py-3.5 transition-colors group cursor-pointer ${isCurrent ? 'bg-app-accent/5 border-l-2 border-l-app-accent' : 'hover:bg-app-elevated border-l-2 border-l-transparent'}`}
                      onClick={() => {
                        if (isCurrent) return
                        guardUnsaved(async () => {
                          setLoadingId(d.id)
                          try { await diagramStore.loadDiagram(d.id) }
                          catch { uiStore.showToast('Failed to open diagram. Please try again.') }
                          finally { setLoadingId(null) }
                        })
                      }}
                    >
                      <span className="text-[11px] font-mono text-app-text-3 w-5 text-right shrink-0 tabular-nums">{i + 1}</span>
                      <div className="w-8 h-8 rounded-lg bg-app-elevated border border-app-border flex items-center justify-center shrink-0">
                        <FileText size={14} className={isCurrent ? 'text-app-accent' : 'text-app-text-3'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-app-text font-medium truncate">{d.name}</p>
                        <p className="text-[11px] text-app-text-3 mt-0.5 flex items-center gap-1.5">
                          {isCurrent && (
                            <span className="inline-flex items-center gap-1 text-app-accent font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-app-accent inline-block" />
                              Open
                            </span>
                          )}
                          <span>{formatDate(d.updatedAt)}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                        {loadingId === d.id && <Loader2 size={14} className="animate-spin text-app-accent" />}
                        <button
                          onClick={() => handleDelete(d.id, d.name)}
                          disabled={deletingId === d.id}
                          className="p-1.5 rounded-lg text-app-text-3 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                        >
                          {deletingId === d.id
                            ? <Loader2 size={13} className="animate-spin" />
                            : <Trash2 size={13} strokeWidth={1.8} />
                          }
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  )
})

export default DiagramsModal
