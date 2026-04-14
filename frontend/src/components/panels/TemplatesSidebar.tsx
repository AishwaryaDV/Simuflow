import { useState, useCallback } from 'react'
import { observer } from 'mobx-react-lite'
import { runInAction } from 'mobx'
import { X, Lightbulb, Lock, Play, Trash2, ChevronLeft, Loader2 } from 'lucide-react'
import { graphStore } from '../../stores/GraphStore'
import { simulationStore } from '../../stores/SimulationStore'
import { uiStore } from '../../stores/UIStore'
import { SimulationStatus } from '../../types/topology'
import {
  TEMPLATES,
  TEMPLATES_BY_CATEGORY,
  CATEGORY_LABELS,
  type Template,
  type TemplateCategory,
} from '../../templates/index'

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_ORDER: TemplateCategory[] = ['fundamentals', 'distributed', 'data', 'ai']

const CATEGORY_ACCENT: Record<TemplateCategory, { pill: string; dot: string }> = {
  fundamentals: { pill: 'text-blue-400 border-blue-500/30 bg-blue-500/10',    dot: 'bg-blue-400'    },
  distributed:  { pill: 'text-purple-400 border-purple-500/30 bg-purple-500/10', dot: 'bg-purple-400' },
  data:         { pill: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10', dot: 'bg-emerald-400' },
  ai:           { pill: 'text-orange-400 border-orange-500/30 bg-orange-500/10', dot: 'bg-orange-400'  },
}

// ── Template card ──────────────────────────────────────────────────────────────

interface CardProps {
  template:      Template
  isLoaded:      boolean
  isLoading:     boolean
  onLoad:        (t: Template) => void
  onShowDetails: (t: Template) => void
}

function TemplateCard({ template, isLoaded, isLoading, onLoad, onShowDetails }: CardProps) {
  const isReady    = template.slug === 'blank' || template.topology !== null
  const hasDetails = template.details !== null
  const accent     = CATEGORY_ACCENT[template.category]

  return (
    <div
      className={[
        'group relative flex items-start gap-3 px-4 py-3 border-b border-app-border/50 transition-colors',
        isReady  ? 'hover:bg-app-elevated cursor-pointer' : 'opacity-50 cursor-not-allowed',
        isLoaded ? 'bg-app-accent/5 border-l-2 border-l-app-accent'  : '',
      ].join(' ')}
      onClick={() => isReady && !isLoading && onLoad(template)}
    >
      {/* Category dot */}
      <div className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${accent.dot}`} />

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-xs font-semibold text-app-text truncate leading-tight">
            {template.name}
          </span>
          {isLoaded && (
            <span className="shrink-0 text-[9px] font-bold text-app-accent bg-app-accent/15 border border-app-accent/30 rounded-full px-1.5 py-px">
              LOADED
            </span>
          )}
          {!isReady && (
            <span className="shrink-0 flex items-center gap-0.5 text-[9px] font-medium text-app-text-3 border border-app-border/60 rounded-full px-1.5 py-px">
              <Lock size={7} />
              Soon
            </span>
          )}
        </div>
        <p className="text-[11px] text-app-text-2 leading-relaxed line-clamp-2">
          {template.description}
        </p>
      </div>

      {/* Right actions */}
      <div className="shrink-0 flex items-center gap-1 mt-0.5">
        {isLoading && <Loader2 size={13} className="text-app-accent animate-spin" />}

        {hasDetails && isReady && !isLoading && (
          <button
            onClick={e => { e.stopPropagation(); onShowDetails(template) }}
            className="p-1 rounded text-app-text-3 hover:text-yellow-400 hover:bg-yellow-400/10 transition-colors"
            title="Design explanation"
          >
            <Lightbulb size={13} />
          </button>
        )}
      </div>
    </div>
  )
}

// ── Design details view ────────────────────────────────────────────────────────

function DetailsView({ template, onBack }: { template: Template; onBack: () => void }) {
  const d = template.details!
  return (
    <div className="flex flex-col h-full">
      {/* Back header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-app-border shrink-0">
        <button
          onClick={onBack}
          className="p-1 rounded text-app-text-3 hover:text-app-text hover:bg-app-elevated transition-colors"
        >
          <ChevronLeft size={14} />
        </button>
        <Lightbulb size={13} className="text-yellow-400" />
        <span className="text-xs font-semibold text-app-text truncate">{template.name}</span>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 text-xs text-app-text-2">

        <section>
          <h4 className="text-[10px] font-bold text-app-text-3 uppercase tracking-wider mb-2">Overview</h4>
          <p className="leading-relaxed">{d.overview}</p>
        </section>

        <section>
          <h4 className="text-[10px] font-bold text-app-text-3 uppercase tracking-wider mb-2">Key Components</h4>
          <ul className="space-y-2">
            {d.components.map(c => (
              <li key={c.name} className="flex gap-2">
                <span className="font-semibold text-app-text shrink-0">{c.name}</span>
                <span className="text-app-text-2">— {c.role}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h4 className="text-[10px] font-bold text-app-text-3 uppercase tracking-wider mb-2">What to Watch</h4>
          <ul className="space-y-1.5">
            {d.watchFor.map((w, i) => (
              <li key={i} className="flex gap-2 leading-relaxed">
                <span className="text-app-accent shrink-0">•</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h4 className="text-[10px] font-bold text-app-text-3 uppercase tracking-wider mb-2">Try This</h4>
          <p className="leading-relaxed text-app-text-2 italic border-l-2 border-app-accent/40 pl-3">
            {d.tryThis}
          </p>
        </section>

      </div>
    </div>
  )
}

// ── Main sidebar ───────────────────────────────────────────────────────────────

const TemplatesSidebar = observer(() => {
  const [loadingSlug,    setLoadingSlug]    = useState<string | null>(null)
  const [loadedTemplate, setLoadedTemplate] = useState<Template | null>(null)
  const [detailsFor,     setDetailsFor]     = useState<Template | null>(null)

  const isSimRunning = simulationStore.status !== SimulationStatus.Idle

  const handleLoad = useCallback((template: Template) => {
    if (loadingSlug) return

    const hasContent = graphStore.nodeCount > 0 && loadedTemplate?.slug !== template.slug
    if (hasContent) {
      const ok = confirm(`Load "${template.name}"? Your current canvas will be replaced.`)
      if (!ok) return
    }

    setLoadingSlug(template.slug)

    setTimeout(() => {
      runInAction(() => {
        if (isSimRunning) simulationStore.stop()

        if (template.slug === 'blank') {
          graphStore.clearCanvas()
          graphStore.setName('Untitled Diagram')
        } else if (template.topology) {
          graphStore.loadTopology(template.topology, undefined, template.name)
        }
      })
      setLoadingSlug(null)
      setLoadedTemplate(template)
      setDetailsFor(null)
    }, 450)
  }, [loadingSlug, loadedTemplate, isSimRunning])

  const handleSimulate = useCallback(() => {
    runInAction(() => simulationStore.start())
    runInAction(() => uiStore.closePanel('templates'))
  }, [])

  const handleClearCanvas = useCallback(() => {
    if (graphStore.nodeCount === 0) return
    if (!confirm('Clear the canvas? This cannot be undone.')) return
    runInAction(() => {
      if (isSimRunning) simulationStore.stop()
      graphStore.clearCanvas()
    })
    setLoadedTemplate(null)
  }, [isSimRunning])

  const handleClose = useCallback(() => {
    runInAction(() => uiStore.closePanel('templates'))
  }, [])

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <aside className="w-72 h-full flex flex-col bg-app-surface border-l border-app-border shrink-0 overflow-hidden">

      {/* Show details view if a bulb was clicked */}
      {detailsFor ? (
        <DetailsView template={detailsFor} onBack={() => setDetailsFor(null)} />
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-app-border shrink-0">
            <span className="text-xs font-semibold text-app-text">Templates</span>
            <button
              onClick={handleClose}
              className="p-1 rounded text-app-text-3 hover:text-app-text hover:bg-app-elevated transition-colors"
            >
              <X size={13} />
            </button>
          </div>

          {/* Template list — scrollable */}
          <div className="flex-1 overflow-y-auto">
            {CATEGORY_ORDER.map(category => {
              const templates = TEMPLATES_BY_CATEGORY[category]
              if (!templates.length) return null
              return (
                <div key={category}>
                  <div className="px-4 py-2 sticky top-0 bg-app-surface z-10">
                    <span className="text-[10px] font-bold text-app-text-3 uppercase tracking-wider">
                      {CATEGORY_LABELS[category]}
                    </span>
                  </div>
                  {templates.map(t => (
                    <TemplateCard
                      key={t.slug}
                      template={t}
                      isLoaded={loadedTemplate?.slug === t.slug}
                      isLoading={loadingSlug === t.slug}
                      onLoad={handleLoad}
                      onShowDetails={setDetailsFor}
                    />
                  ))}
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-app-border p-3 space-y-2">

            {/* Simulate button — only when a template (non-blank) is loaded */}
            {loadedTemplate && loadedTemplate.slug !== 'blank' && !isSimRunning && (
              <button
                onClick={handleSimulate}
                className="w-full flex items-center justify-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg bg-app-accent hover:bg-app-accent-dim text-white transition-colors"
              >
                <Play size={12} strokeWidth={2.5} />
                Simulate {loadedTemplate.name}
              </button>
            )}

            {/* Clear canvas */}
            <button
              onClick={handleClearCanvas}
              disabled={graphStore.nodeCount === 0}
              className="w-full flex items-center justify-center gap-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/30 hover:border-red-500/50 px-3 py-2 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Trash2 size={12} />
              Clear Canvas
            </button>
          </div>
        </>
      )}
    </aside>
  )
})

export default TemplatesSidebar
