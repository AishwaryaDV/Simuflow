import { useState, useCallback, useEffect, useMemo } from 'react'
import { observer } from 'mobx-react-lite'
import { runInAction } from 'mobx'
import {
  X, Lightbulb, Lock, Trash2, ChevronLeft, Loader2, LayoutTemplate,
  Globe, Zap, Link2, Users, Film, Navigation2, Bot,
  LayoutGrid, ArrowRight, Boxes, ListOrdered,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { graphStore } from '../../stores/GraphStore'
import { simulationStore } from '../../stores/SimulationStore'
import { diagramStore } from '../../stores/DiagramStore'
import { uiStore } from '../../stores/UIStore'
import { SimulationStatus } from '../../types/topology'
import {
  TEMPLATES,
  CATEGORY_LABELS,
  type Template,
  type TemplateCategory,
} from '../../templates/index'
import { api } from '../../lib/api'
import type { TopologySchema } from '../../types/topology'

// ── Icon + colour maps ────────────────────────────────────────────────────────

const TEMPLATE_ICONS: Record<string, LucideIcon> = {
  blank:          LayoutGrid,
  web_app:        Globe,
  cached_web_app: Zap,
  microservices:  Boxes,
  queue_system:   ListOrdered,
  url_shortener:  Link2,
  social_feed:    Users,
  video_streaming:Film,
  ride_sharing:   Navigation2,
  ai_agent:       Bot,
}

const ICON_STYLE = 'text-app-accent bg-app-accent/10'

// ── Template card ──────────────────────────────────────────────────────────────

interface CardProps {
  template:  Template
  isLoading: boolean
  onLoad:    (t: Template) => void
}

function TemplateCard({ template, isLoading, onLoad }: CardProps) {
  const isReady = template.slug === 'blank' || template.topology !== null
  const Icon    = TEMPLATE_ICONS[template.slug] ?? Globe

  return (
    <div className={[
      'rounded-xl border p-3 flex flex-col gap-2 transition-colors',
      isReady
        ? 'border-app-border bg-app-elevated hover:border-app-accent/40'
        : 'border-app-border/40 bg-app-elevated/50 opacity-55',
    ].join(' ')}>

      {/* Top row: icon + name + load button */}
      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${ICON_STYLE}`}>
          <Icon size={14} strokeWidth={1.8} />
        </div>
        <p className="text-xs font-semibold text-white leading-snug flex-1 min-w-0">
          {template.name}
        </p>
        {isReady ? (
          <button
            onClick={() => !isLoading && onLoad(template)}
            disabled={isLoading}
            className="shrink-0 flex items-center gap-1 text-[11px] font-medium text-app-accent hover:text-white hover:bg-app-accent px-2 py-1 rounded-lg transition-colors disabled:opacity-50"
          >
            {isLoading
              ? <><Loader2 size={11} className="animate-spin" /> Loading</>
              : <><ArrowRight size={11} /> Load</>
            }
          </button>
        ) : (
          <span className="shrink-0 flex items-center gap-1 text-[10px] font-medium text-app-text-3 border border-app-border/50 rounded-full px-2 py-0.5">
            <Lock size={8} />
            Soon
          </span>
        )}
      </div>

      {/* Description — full, no truncation */}
      <p className="text-[11px] text-app-text-2 leading-relaxed">
        {template.description}
      </p>
    </div>
  )
}

// ── Design details view ────────────────────────────────────────────────────────

function DetailsView({ template, onBack }: { template: Template; onBack: () => void }) {
  const d = template.details!
  const Icon = TEMPLATE_ICONS[template.slug] ?? Globe

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-app-border shrink-0">
        <button
          onClick={onBack}
          className="p-1 rounded text-app-text-3 hover:text-app-text hover:bg-app-elevated transition-colors shrink-0"
        >
          <ChevronLeft size={14} />
        </button>
        <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${ICON_STYLE}`}>
          <Icon size={12} strokeWidth={2} />
        </div>
        <span className="text-xs font-semibold text-white truncate">{template.name}</span>
        <Lightbulb size={12} className="text-yellow-400 shrink-0 ml-auto" />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 text-xs text-app-text-2">

        <section>
          <h4 className="text-[10px] font-bold text-app-text-3 uppercase tracking-wider mb-2">Overview</h4>
          <p className="leading-relaxed">{d.overview}</p>
        </section>

        <section>
          <h4 className="text-[10px] font-bold text-app-text-3 uppercase tracking-wider mb-2">Key Components</h4>
          <ul className="space-y-2.5">
            {d.components.map(c => (
              <li key={c.name}>
                <span className="font-semibold text-app-text">{c.name}</span>
                <span className="text-app-text-2"> — {c.role}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h4 className="text-[10px] font-bold text-app-text-3 uppercase tracking-wider mb-2">What to Watch</h4>
          <ul className="space-y-1.5">
            {d.watchFor.map((w, i) => (
              <li key={i} className="flex gap-2 leading-relaxed">
                <span className="text-app-accent shrink-0 mt-px">•</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h4 className="text-[10px] font-bold text-app-text-3 uppercase tracking-wider mb-2">Try This</h4>
          <p className="leading-relaxed italic border-l-2 border-app-accent/40 pl-3">
            {d.tryThis}
          </p>
        </section>

      </div>
    </div>
  )
}

// ── Main sidebar ───────────────────────────────────────────────────────────────

const CATEGORY_ORDER: TemplateCategory[] = ['fundamentals', 'distributed', 'ai']

const TemplatesSidebar = observer(() => {
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null)
  const [templates, setTemplates]     = useState<Template[]>(TEMPLATES)

  // Fetch topologies from API and merge into local template list.
  // Local templates are the fallback if the API is unreachable.
  useEffect(() => {
    api.presets.list()
      .then(presets => {
        setTemplates(prev => prev.map(t => {
          const preset = presets.find(p => p.slug === t.slug)
          return preset ? { ...t, topology: preset.topology as TopologySchema } : t
        }))
      })
      .catch(() => {}) // keep local data on failure
  }, [])

  const templatesByCategory = useMemo(() =>
    CATEGORY_ORDER.reduce<Record<TemplateCategory, Template[]>>(
      (acc, cat) => { acc[cat] = templates.filter(t => t.category === cat); return acc },
      { fundamentals: [], distributed: [], ai: [] },
    ),
  [templates])

  const isSimRunning = simulationStore.status !== SimulationStatus.Idle

  // Derive details view from UIStore — so the bulb badge can drive it from outside
  const detailsFor = uiStore.templateDetailsOpen && uiStore.loadedTemplateSlug
    ? (templates.find(t => t.slug === uiStore.loadedTemplateSlug) ?? null)
    : null

  const doLoad = useCallback((template: Template) => {
    setLoadingSlug(template.slug)

    setTimeout(() => {
      runInAction(() => {
        if (isSimRunning) simulationStore.stop()

        if (template.slug === 'blank') {
          graphStore.clearCanvas()
        } else if (template.topology) {
          graphStore.loadTopology(template.topology, undefined, template.name)
        }
        // The canvas no longer holds the previously open diagram — a later
        // Save must create a new record, not overwrite the old one.
        diagramStore.setCurrentId(null)
      })

      setLoadingSlug(null)

      if (template.slug === 'blank') {
        localStorage.removeItem('simuflow:template-slug')
        runInAction(() => { uiStore.setLoadedTemplate(null); uiStore.closePanel('templates') })
      } else if (template.details) {
        localStorage.setItem('simuflow:template-slug', template.slug)
        runInAction(() => uiStore.setLoadedTemplate(template.slug))
      } else {
        localStorage.setItem('simuflow:template-slug', template.slug)
        runInAction(() => { uiStore.setLoadedTemplate(template.slug); uiStore.closePanel('templates') })
      }
    }, 450)
  }, [isSimRunning])

  const handleLoad = useCallback((template: Template) => {
    if (loadingSlug) return

    const hasContent = graphStore.nodeCount > 0
    if (hasContent) {
      runInAction(() => uiStore.openConfirm(
        `Load template: ${template.name}`,
        `This will replace your current canvas with the "${template.name}" template. Any unsaved work will be lost.`,
        () => doLoad(template),
        false,
      ))
      return
    }

    doLoad(template)
  }, [loadingSlug, doLoad])

  const handleClearCanvas = useCallback(() => {
    if (graphStore.nodeCount === 0) return
    runInAction(() => uiStore.openConfirm(
      'Clear canvas',
      'This will remove all nodes and edges. This cannot be undone.',
      () => {
        localStorage.removeItem('simuflow:template-slug')
        runInAction(() => {
          if (isSimRunning) simulationStore.stop()
          graphStore.clearCanvas()
          diagramStore.setCurrentId(null)
          uiStore.setLoadedTemplate(null)
        })
      },
    ))
  }, [isSimRunning])

  const handleClose = useCallback(() => {
    runInAction(() => uiStore.closePanel('templates'))
  }, [])

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <aside className="w-72 h-full flex flex-col bg-app-surface border-l border-app-border shrink-0 overflow-hidden">

      {detailsFor ? (
        <DetailsView template={detailsFor} onBack={() => runInAction(() => uiStore.closeTemplateDetails())} />
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-app-border shrink-0">
            <LayoutTemplate size={14} className="text-app-accent shrink-0" />
            <span className="text-xs font-semibold text-white flex-1">Templates</span>
            <button
              onClick={handleClose}
              className="p-1 rounded text-app-text-3 hover:text-app-text hover:bg-app-elevated transition-colors"
            >
              <X size={13} />
            </button>
          </div>

          {/* Template list — scrollable */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
            {CATEGORY_ORDER.map(category => {
              const cats = templatesByCategory[category]
              if (!cats.length) return null
              return (
                <section key={category}>
                  <p className="text-[10px] font-bold text-app-text-3 uppercase tracking-wider mb-2 px-1">
                    {CATEGORY_LABELS[category]}
                  </p>
                  <div className="space-y-2">
                    {cats.map((t: Template) => (
                      <TemplateCard
                        key={t.slug}
                        template={t}
                        isLoading={loadingSlug === t.slug}
                        onLoad={handleLoad}
                      />
                    ))}
                  </div>
                </section>
              )
            })}
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-app-border p-3">
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
