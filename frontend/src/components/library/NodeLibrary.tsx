import { useCallback, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { runInAction } from 'mobx'
import { ChevronLeft, ChevronRight, Zap } from 'lucide-react'
import { NodeType, StructuralNodeType, SimulationStatus } from '../../types/topology'
import {
  NODE_DISPLAY, STRUCTURAL_DISPLAY,
  NODE_CATEGORIES, type NodeCategory,
} from '../canvas/nodeConfig'
import { SCENARIOS_BY_CATEGORY } from '../../stores/ChaosStore'
import type { ChaosScenarioDef, ChaosCategory } from '../../types/topology'
import { simulationStore } from '../../stores/SimulationStore'
import { uiStore } from '../../stores/UIStore'

// ── Fixed-position tooltip ────────────────────────────────────────────────────

interface TooltipState { label: string; description: string; x: number; y: number }

function FloatingTooltip({ tip }: { tip: TooltipState }) {
  return (
    <div
      style={{ position: 'fixed', left: tip.x + 12, top: tip.y, zIndex: 9999, pointerEvents: 'none' }}
      className="w-52"
    >
      <div className="bg-app-elevated border border-app-border rounded-lg px-3 py-2 shadow-xl shadow-black/60">
        <p className="text-xs font-semibold text-app-text leading-tight mb-0.5">{tip.label}</p>
        <p className="text-[10px] text-app-text-2 leading-relaxed">{tip.description}</p>
      </div>
    </div>
  )
}

// ── Simulation node card ──────────────────────────────────────────────────────

function SimNodeCard({ nodeType, onTip }: {
  nodeType: NodeType
  onTip: (tip: TooltipState | null) => void
}) {
  const display = NODE_DISPLAY[nodeType]
  const Icon = display.icon

  const onDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.setData('application/simuflow-node-type', nodeType)
    e.dataTransfer.effectAllowed = 'copy'
    const ghost = document.createElement('div')
    ghost.style.cssText = 'position:fixed;top:-200px;left:-200px;background:#1e1e2e;border:1px solid #3a3a5c;border-radius:8px;padding:6px 10px;color:#fff;font-size:11px;font-family:sans-serif;display:flex;align-items:center;gap:6px;white-space:nowrap;'
    ghost.textContent = display.label
    document.body.appendChild(ghost)
    e.dataTransfer.setDragImage(ghost, ghost.offsetWidth / 2, ghost.offsetHeight / 2)
    requestAnimationFrame(() => document.body.removeChild(ghost))
  }, [nodeType, display.label])

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onMouseEnter={e => onTip({ label: display.label, description: display.description, x: e.clientX, y: e.clientY - 60 })}
      onMouseMove={e => onTip({ label: display.label, description: display.description, x: e.clientX, y: e.clientY - 60 })}
      onMouseLeave={() => onTip(null)}
      className="flex flex-col items-center justify-center gap-1 px-1 py-2.5 rounded-lg border border-app-border bg-app-elevated cursor-grab active:cursor-grabbing hover:border-app-accent/50 hover:bg-app-elevated/80 transition-all text-center min-w-0"
    >
      <Icon size={16} className={`${display.textClass} shrink-0`} strokeWidth={1.8} />
      <p className={`text-[10px] font-semibold ${display.textClass} leading-tight w-full text-center truncate px-0.5`}>
        {display.label}
      </p>
    </div>
  )
}

// ── Structural container card ─────────────────────────────────────────────────

function StructuralCard({ structuralType, onTip }: {
  structuralType: StructuralNodeType
  onTip: (tip: TooltipState | null) => void
}) {
  const display = STRUCTURAL_DISPLAY[structuralType]
  const Icon = display.icon
  const desc = `Visual container — ${display.label.toLowerCase()} boundary for your diagram`

  const onDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.setData('application/simuflow-structural-type', structuralType)
    e.dataTransfer.effectAllowed = 'copy'
    const ghost = document.createElement('div')
    ghost.style.cssText = 'position:fixed;top:-200px;left:-200px;background:#1e1e2e;border:1px dashed #3a3a5c;border-radius:8px;padding:6px 10px;color:#aaa;font-size:11px;font-family:sans-serif;white-space:nowrap;'
    ghost.textContent = display.label
    document.body.appendChild(ghost)
    e.dataTransfer.setDragImage(ghost, ghost.offsetWidth / 2, ghost.offsetHeight / 2)
    requestAnimationFrame(() => document.body.removeChild(ghost))
  }, [structuralType, display.label])

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onMouseEnter={e => onTip({ label: display.label, description: desc, x: e.clientX, y: e.clientY - 60 })}
      onMouseMove={e => onTip({ label: display.label, description: desc, x: e.clientX, y: e.clientY - 60 })}
      onMouseLeave={() => onTip(null)}
      className="flex flex-col items-center justify-center gap-1 px-1 py-2.5 rounded-lg border border-dashed border-app-border bg-app-elevated/50 cursor-grab active:cursor-grabbing hover:border-app-accent/50 hover:bg-app-elevated transition-all text-center min-w-0"
    >
      <Icon size={14} className={`${display.textClass} shrink-0`} strokeWidth={1.8} />
      <p className={`text-[10px] font-medium ${display.textClass} leading-tight w-full text-center truncate px-0.5`}>
        {display.label}
      </p>
    </div>
  )
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-app-text-3 mb-1.5 mt-1">
      {title}
    </p>
  )
}

// ── Category map ──────────────────────────────────────────────────────────────

const SIM_BY_CATEGORY: Record<NodeCategory, NodeType[]> = (() => {
  const map = {} as Record<NodeCategory, NodeType[]>
  for (const type of Object.values(NodeType)) {
    const cat = NODE_DISPLAY[type].category
    if (!map[cat]) map[cat] = []
    map[cat].push(type)
  }
  return map
})()

// ── Chaos category config ─────────────────────────────────────────────────────

const CHAOS_CATEGORY_CONFIG: Record<ChaosCategory, { label: string; textClass: string; borderClass: string; bgClass: string }> = {
  infrastructure: { label: 'Infrastructure',  textClass: 'text-orange-400', borderClass: 'border-orange-500/40', bgClass: 'bg-orange-500/10' },
  network:        { label: 'Network',          textClass: 'text-blue-400',   borderClass: 'border-blue-500/40',   bgClass: 'bg-blue-500/10'   },
  application:    { label: 'Application',      textClass: 'text-purple-400', borderClass: 'border-purple-500/40', bgClass: 'bg-purple-500/10' },
  traffic:        { label: 'Traffic',          textClass: 'text-yellow-400', borderClass: 'border-yellow-500/40', bgClass: 'bg-yellow-500/10' },
  dependency:     { label: 'Dependency',       textClass: 'text-red-400',    borderClass: 'border-red-500/40',    bgClass: 'bg-red-500/10'    },
  data:           { label: 'Data Layer',       textClass: 'text-green-400',  borderClass: 'border-green-500/40',  bgClass: 'bg-green-500/10'  },
}

// ── Chaos item card (square) ──────────────────────────────────────────────────

function ChaosCard({ scenario, onTip }: {
  scenario: ChaosScenarioDef
  onTip: (tip: TooltipState | null) => void
}) {
  const cfg = CHAOS_CATEGORY_CONFIG[scenario.category]
  const isRunning = simulationStore.status === SimulationStatus.Running ||
                    simulationStore.status === SimulationStatus.Chaos

  const onDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.setData('application/simuflow-chaos-id', scenario.id)
    e.dataTransfer.effectAllowed = 'copy'
    const ghost = document.createElement('div')
    ghost.style.cssText = `position:fixed;top:-200px;left:-200px;background:#1a1a2e;border:1px solid #4c1d95;border-radius:6px;padding:4px 8px;color:#a78bfa;font-size:10px;font-family:monospace;white-space:nowrap;`
    ghost.textContent = scenario.tag
    document.body.appendChild(ghost)
    e.dataTransfer.setDragImage(ghost, ghost.offsetWidth / 2, ghost.offsetHeight / 2)
    requestAnimationFrame(() => document.body.removeChild(ghost))
  }, [scenario])

  const onDragEnd = useCallback(() => {
    // Show toast if dropped while sim is not running (CanvasPanel also handles this,
    // but dragend fires even on failed drops)
    if (!isRunning) {
      runInAction(() => uiStore.showToast('Start simulation to inject chaos'))
    }
  }, [isRunning])

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onMouseEnter={e => onTip({ label: scenario.name, description: scenario.description, x: e.clientX, y: e.clientY - 60 })}
      onMouseMove={e => onTip({ label: scenario.name, description: scenario.description, x: e.clientX, y: e.clientY - 60 })}
      onMouseLeave={() => onTip(null)}
      className={[
        'flex flex-col items-center justify-center gap-1 p-1.5 cursor-grab active:cursor-grabbing transition-all text-center min-w-0',
        'rounded-lg border aspect-square',
        cfg.borderClass, cfg.bgClass,
        `hover:brightness-125`,
        !isRunning ? 'opacity-50' : '',
      ].join(' ')}
      title={scenario.name}
    >
      <span className={`text-[8px] font-bold font-mono ${cfg.textClass} leading-none truncate w-full text-center px-0.5`}>
        {scenario.tag}
      </span>
      <p className={`text-[9px] font-semibold ${cfg.textClass} leading-tight w-full text-center line-clamp-2 px-0.5`}>
        {scenario.name}
      </p>
    </div>
  )
}

// ── NodeLibrary ───────────────────────────────────────────────────────────────

const CHAOS_CATEGORIES = Object.keys(SCENARIOS_BY_CATEGORY) as ChaosCategory[]

const NodeLibrary = observer(() => {
  const [tip, setTip]           = useState<TooltipState | null>(null)
  const [activeTab, setActiveTab] = useState<'components' | 'chaos'>('components')
  const collapsed = uiStore.sidebarCollapsed

  if (collapsed) {
    return (
      <aside className="w-8 bg-app-surface border-r border-app-border flex flex-col items-center py-3 shrink-0">
        <button
          onClick={() => runInAction(() => uiStore.toggleSidebar())}
          className="p-1 rounded-lg text-app-text-3 hover:text-app-text hover:bg-app-elevated transition-colors"
          title="Expand sidebar"
        >
          <ChevronRight size={14} />
        </button>
      </aside>
    )
  }

  return (
    <aside className="w-60 bg-app-surface border-r border-app-border flex flex-col shrink-0">
      {tip && <FloatingTooltip tip={tip} />}

      {/* Header — tab toggle + collapse button */}
      <div className="flex items-center gap-1 px-2 pt-2 pb-1.5 border-b border-app-border shrink-0">
        <div className="flex flex-1 bg-app-elevated rounded-lg p-0.5 gap-0.5">
          <button
            onClick={() => setActiveTab('components')}
            className={[
              'flex-1 text-[10px] font-semibold py-1 rounded-md transition-colors',
              activeTab === 'components'
                ? 'bg-app-surface text-app-text shadow-sm'
                : 'text-app-text-3 hover:text-app-text-2',
            ].join(' ')}
          >
            Components
          </button>
          <button
            onClick={() => setActiveTab('chaos')}
            className={[
              'flex-1 text-[10px] font-semibold py-1 rounded-md transition-colors flex items-center justify-center gap-1',
              activeTab === 'chaos'
                ? 'bg-app-surface text-purple-400 shadow-sm'
                : 'text-app-text-3 hover:text-app-text-2',
            ].join(' ')}
          >
            <Zap size={9} strokeWidth={2.5} />
            Chaos
          </button>
        </div>
        <button
          onClick={() => runInAction(() => uiStore.toggleSidebar())}
          className="p-1 rounded-lg text-app-text-3 hover:text-app-text hover:bg-app-elevated transition-colors shrink-0"
          title="Collapse sidebar"
        >
          <ChevronLeft size={13} />
        </button>
      </div>

      {/* ── Components tab ─────────────────────────────────────────────────── */}
      {activeTab === 'components' && (
        <div className="flex-1 overflow-y-auto no-scrollbar px-3 py-3 flex flex-col gap-3">
          <div>
            <p className="text-[11px] font-semibold text-app-text-2 px-1 mb-2">Components</p>
            {NODE_CATEGORIES.map(cat => (
              <div key={cat} className="mb-3">
                <SectionHeader title={cat} />
                <div className="grid grid-cols-2 gap-1.5">
                  {SIM_BY_CATEGORY[cat]?.map(type => (
                    <SimNodeCard key={type} nodeType={type} onTip={setTip} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="h-px bg-app-border" />

          <div>
            <p className="text-[11px] font-semibold text-app-text-2 px-1 mb-1">Infrastructure</p>
            <p className="text-[10px] text-app-text-3 px-1 mb-2">Visual containers — engine ignores these</p>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.values(StructuralNodeType).map(type => (
                <StructuralCard key={type} structuralType={type} onTip={setTip} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Chaos tab ──────────────────────────────────────────────────────── */}
      {activeTab === 'chaos' && (
        <div className="flex-1 overflow-y-auto no-scrollbar px-3 py-3 flex flex-col gap-4">

          {/* Simulation-gated hint */}
          {simulationStore.status === SimulationStatus.Idle && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-purple-500/5 border border-purple-500/20">
              <Zap size={12} className="text-purple-400 shrink-0 mt-0.5" strokeWidth={2} />
              <p className="text-[10px] text-purple-300/80 leading-relaxed">
                Start the simulation before injecting chaos events.
              </p>
            </div>
          )}

          {CHAOS_CATEGORIES.map(category => {
            const scenarios = SCENARIOS_BY_CATEGORY[category]
            const cfg = CHAOS_CATEGORY_CONFIG[category]
            return (
              <div key={category}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${cfg.textClass}`}>
                    {cfg.label}
                  </p>
                  <span className={`text-[9px] font-medium ${cfg.textClass} opacity-60`}>
                    ({scenarios.length})
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {scenarios.map(scenario => (
                    <ChaosCard key={scenario.id} scenario={scenario} onTip={setTip} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </aside>
  )
})

export default NodeLibrary
