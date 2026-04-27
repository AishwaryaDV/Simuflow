/**
 * ChaosToolbar
 * Bottom-of-canvas bar with 6 chaos category icon shortcuts.
 * Each icon opens a popover listing that category's scenarios.
 * Only renders when simulation is running (or in chaos mode).
 */
import { useState, useRef, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import {
  Server, Wifi, Cpu, TrendingUp, GitBranch, Database,
} from 'lucide-react'
import { simulationStore } from '../../stores/SimulationStore'
import { chaosStore, SCENARIOS_BY_CATEGORY } from '../../stores/ChaosStore'
import { graphStore } from '../../stores/GraphStore'
import { SimulationStatus } from '../../types/topology'
import type { ChaosCategory } from '../../types/topology'

// ── Category config ───────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<ChaosCategory, { label: string; Icon: React.ElementType; color: string; dot: string }> = {
  infrastructure: { label: 'Infrastructure', Icon: Server,     color: 'text-red-400',    dot: 'bg-red-500'    },
  network:        { label: 'Network',         Icon: Wifi,       color: 'text-orange-400', dot: 'bg-orange-400' },
  application:    { label: 'Application',     Icon: Cpu,        color: 'text-yellow-400', dot: 'bg-yellow-400' },
  traffic:        { label: 'Traffic',          Icon: TrendingUp, color: 'text-green-400',  dot: 'bg-green-400'  },
  dependency:     { label: 'Dependency',       Icon: GitBranch,  color: 'text-blue-400',   dot: 'bg-blue-400'   },
  data:           { label: 'Data Layer',       Icon: Database,   color: 'text-purple-400', dot: 'bg-purple-400' },
}

const CATEGORIES = Object.keys(CATEGORY_CONFIG) as ChaosCategory[]

// ── Category popover ──────────────────────────────────────────────────────────

function CategoryPopover({
  category,
  onClose,
}: {
  category: ChaosCategory
  onClose: () => void
}) {
  const cfg      = CATEGORY_CONFIG[category]
  const scenarios = SCENARIOS_BY_CATEGORY[category]
  const ref      = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  // Get first available node id for quick-inject (user can choose via context menu for specificity)
  const firstNodeId = Array.from(graphStore.nodes.keys())[0] ?? null

  return (
    <div
      ref={ref}
      className="absolute bottom-full mb-2 left-0 z-50 w-64 bg-app-surface border border-app-border rounded-xl shadow-xl shadow-black/40 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-app-border">
        <cfg.Icon size={13} className={cfg.color} />
        <span className="text-[11px] font-bold text-app-text">{cfg.label}</span>
        <span className="ml-auto text-[10px] text-app-text-3">{scenarios.length} scenarios</span>
      </div>

      {/* Scenario list */}
      <div className="flex flex-col max-h-64 overflow-y-auto no-scrollbar">
        {scenarios.map(s => {
          const isActive = [...chaosStore.activeScenarios.values()].some(a => a.scenarioId === s.id)
          return (
            <div
              key={s.id}
              className="flex items-center gap-2.5 px-3 py-2 hover:bg-app-elevated/60 transition-colors cursor-default border-b border-app-border/30 last:border-0"
            >
              <div className={['w-1.5 h-1.5 rounded-full shrink-0', cfg.dot].join(' ')} />
              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                <span className="text-[11px] font-semibold text-app-text truncate">{s.name}</span>
                <span className="text-[9px] text-app-text-3 truncate">{s.description}</span>
              </div>
              {isActive ? (
                <span className="text-[9px] font-bold text-purple-300 bg-purple-500/20 px-1.5 py-0.5 rounded-full shrink-0">
                  ON
                </span>
              ) : s.requiresTarget ? (
                <span className="text-[9px] text-app-text-3 shrink-0">right-click node</span>
              ) : firstNodeId ? (
                <button
                  onClick={() => {
                    chaosStore.activateScenario(s.id, [firstNodeId], [])
                    onClose()
                  }}
                  className="text-[9px] font-bold text-purple-400 hover:text-purple-200 bg-purple-500/10 hover:bg-purple-500/20 px-1.5 py-0.5 rounded-full shrink-0 transition-colors"
                >
                  inject
                </button>
              ) : null}
            </div>
          )
        })}
      </div>

      <p className="text-[9px] text-app-text-3 px-3 py-2 border-t border-app-border/30">
        Right-click any node/edge for targeted injection.
      </p>
    </div>
  )
}

// ── ChaosToolbar ──────────────────────────────────────────────────────────────

const ChaosToolbar = observer(() => {
  const [openCategory, setOpenCategory] = useState<ChaosCategory | null>(null)

  const isRunning = simulationStore.status === SimulationStatus.Running ||
                    simulationStore.status === SimulationStatus.Chaos

  if (!isRunning) return null

  const activeCount = chaosStore.activeScenarios.size

  return (
    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-app-surface border border-app-border rounded-xl px-2 py-1.5 shadow-lg shadow-black/30">
      {/* Active indicator */}
      {activeCount > 0 && (
        <div className="flex items-center gap-1 mr-1 pr-2 border-r border-app-border">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
          <span className="text-[10px] font-bold text-purple-300 tabular-nums">{activeCount}</span>
        </div>
      )}

      {CATEGORIES.map(cat => {
        const cfg     = CATEGORY_CONFIG[cat]
        const isOpen  = openCategory === cat
        const catActive = [...chaosStore.activeScenarios.values()].some(
          a => SCENARIOS_BY_CATEGORY[cat].some(s => s.id === a.scenarioId),
        )

        return (
          <div key={cat} className="relative">
            {openCategory === cat && (
              <CategoryPopover
                category={cat}
                onClose={() => setOpenCategory(null)}
              />
            )}
            <button
              onClick={() => setOpenCategory(isOpen ? null : cat)}
              title={cfg.label}
              className={[
                'relative flex items-center justify-center w-7 h-7 rounded-lg transition-colors',
                isOpen
                  ? 'bg-app-elevated text-app-text'
                  : 'text-app-text-3 hover:text-app-text hover:bg-app-elevated/60',
              ].join(' ')}
            >
              <cfg.Icon size={13} className={isOpen ? cfg.color : undefined} strokeWidth={1.8} />
              {catActive && (
                <span className={['absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border border-app-surface', cfg.dot].join(' ')} />
              )}
            </button>
          </div>
        )
      })}
    </div>
  )
})

export default ChaosToolbar
