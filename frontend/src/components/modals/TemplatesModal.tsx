import { useCallback } from 'react'
import { observer } from 'mobx-react-lite'
import { runInAction } from 'mobx'
import { X, LayoutTemplate, Lock } from 'lucide-react'
import { graphStore } from '../../stores/GraphStore'
import { simulationStore } from '../../stores/SimulationStore'
import { SimulationStatus } from '../../types/topology'
import {
  TEMPLATES,
  TEMPLATES_BY_CATEGORY,
  CATEGORY_LABELS,
  type Template,
  type TemplateCategory,
} from '../../templates/index'

interface Props {
  onClose: () => void
}

const CATEGORY_ORDER: TemplateCategory[] = ['fundamentals', 'distributed', 'data', 'ai']

const CATEGORY_ACCENT: Record<TemplateCategory, string> = {
  fundamentals: 'text-blue-400  border-blue-500/30  bg-blue-500/10',
  distributed:  'text-purple-400 border-purple-500/30 bg-purple-500/10',
  data:         'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  ai:           'text-orange-400 border-orange-500/30 bg-orange-500/10',
}

function TemplateCard({ template, onLoad }: { template: Template; onLoad: (t: Template) => void }) {
  const isReady = template.slug === 'blank' || template.topology !== null
  const accent  = CATEGORY_ACCENT[template.category]

  return (
    <button
      onClick={() => isReady && onLoad(template)}
      disabled={!isReady}
      className={[
        'relative text-left p-4 rounded-xl border transition-all duration-150 group',
        isReady
          ? 'border-app-border bg-app-elevated hover:border-app-accent/50 hover:bg-app-surface cursor-pointer'
          : 'border-app-border/50 bg-app-elevated/50 cursor-not-allowed opacity-60',
      ].join(' ')}
    >
      {/* Coming soon badge */}
      {!isReady && (
        <span className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-medium text-app-text-3 border border-app-border/60 rounded-full px-2 py-0.5">
          <Lock size={8} />
          Soon
        </span>
      )}

      {/* Category pill */}
      <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border mb-2.5 ${accent}`}>
        {CATEGORY_LABELS[template.category]}
      </span>

      <p className="text-sm font-semibold text-app-text leading-snug mb-1.5 group-hover:text-white transition-colors">
        {template.name}
      </p>
      <p className="text-xs text-app-text-2 leading-relaxed line-clamp-2">
        {template.description}
      </p>
    </button>
  )
}

const TemplatesModal = observer(({ onClose }: Props) => {
  const isRunning = simulationStore.status !== SimulationStatus.Idle

  const handleLoad = useCallback((template: Template) => {
    const hasContent = graphStore.nodeCount > 0

    if (hasContent) {
      const confirmed = confirm(
        `Load "${template.name}"? Your current canvas will be replaced.`
      )
      if (!confirmed) return
    }

    runInAction(() => {
      if (isRunning) simulationStore.stop()

      if (template.slug === 'blank') {
        graphStore.clearCanvas()
        graphStore.setName('Untitled Diagram')
      } else if (template.topology) {
        graphStore.loadTopology(template.topology, undefined, template.name)
      }
    })

    onClose()
  }, [isRunning, onClose])

  const handleBackdrop = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }, [onClose])

  const totalReady = TEMPLATES.filter(t => t.slug === 'blank' || t.topology !== null).length

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdrop}
    >
      <div className="relative w-full max-w-3xl max-h-[80vh] mx-4 bg-app-surface border border-app-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-app-border shrink-0">
          <div className="flex items-center gap-2.5">
            <LayoutTemplate size={16} className="text-app-accent" />
            <h2 className="text-sm font-semibold text-app-text">Templates</h2>
            <span className="text-xs text-app-text-3 font-medium">
              {totalReady} ready · {TEMPLATES.length - totalReady} coming soon
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-app-text-3 hover:text-app-text hover:bg-app-elevated transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="overflow-y-auto px-6 py-5 space-y-7">
          {CATEGORY_ORDER.map(category => {
            const templates = TEMPLATES_BY_CATEGORY[category]
            if (!templates.length) return null
            return (
              <section key={category}>
                <h3 className="text-xs font-semibold text-app-text-3 uppercase tracking-wider mb-3">
                  {CATEGORY_LABELS[category]}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {templates.map(t => (
                    <TemplateCard key={t.slug} template={t} onLoad={handleLoad} />
                  ))}
                </div>
              </section>
            )
          })}
        </div>

      </div>
    </div>
  )
})

export default TemplatesModal
