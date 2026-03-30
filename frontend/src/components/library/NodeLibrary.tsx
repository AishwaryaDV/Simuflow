import { useCallback, useState } from 'react'
import { NodeType, StructuralNodeType } from '../../types/topology'
import {
  NODE_DISPLAY, STRUCTURAL_DISPLAY,
  NODE_CATEGORIES, type NodeCategory,
} from '../canvas/nodeConfig'

// ── Fixed-position tooltip (escapes scroll-container clipping) ────────────────

interface TooltipState { label: string; description: string; x: number; y: number }

function FloatingTooltip({ tip }: { tip: TooltipState }) {
  return (
    <div
      style={{ position: 'fixed', left: tip.x + 12, top: tip.y, zIndex: 9999, pointerEvents: 'none' }}
      className="w-48"
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
    // Clean drag ghost — just icon + label in a small pill
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

// ── NodeLibrary ───────────────────────────────────────────────────────────────

export default function NodeLibrary() {
  const [tip, setTip] = useState<TooltipState | null>(null)

  return (
    <aside className="w-60 bg-app-surface border-r border-app-border flex flex-col shrink-0">
      {tip && <FloatingTooltip tip={tip} />}

      <div className="flex-1 overflow-y-auto no-scrollbar px-3 py-3 flex flex-col gap-3">

        {/* Simulation Components */}
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

        {/* Infrastructure */}
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
    </aside>
  )
}
