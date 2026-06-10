import { useCallback, useEffect, useRef, useState } from 'react'
import { NodeResizer, type Node, type NodeProps, type ResizeDragEvent, type ResizeParams } from '@xyflow/react'
// No Handle imports — structural nodes are not connectable
import { observer } from 'mobx-react-lite'
import { runInAction } from 'mobx'
import { Zap, X } from 'lucide-react'
import { graphStore } from '../../stores/GraphStore'
import { chaosStore } from '../../stores/ChaosStore'
import { simulationStore } from '../../stores/SimulationStore'
import { STRUCTURAL_DISPLAY } from './nodeConfig'
import type { StructuralNode } from '../../types/topology'
import { ChaosScenarioId, SimulationStatus } from '../../types/topology'

export type StructuralRFData = { structuralNode: StructuralNode }
export type StructuralRFNode = Node<StructuralRFData, 'structural'>

const GROUP_SCENARIOS = [
  { id: ChaosScenarioId.InfraAzFailure,  label: 'AZ Failure',       tag: 'AZ_FAILURE',  desc: 'Kills all nodes in this zone' },
  { id: ChaosScenarioId.InfraDcOutage,   label: 'Data Centre Outage', tag: 'DC_OUTAGE',  desc: 'Takes down this entire group' },
]

const StructuralNodeComponent = observer(({ data, selected }: NodeProps<StructuralRFNode>) => {
  const { structuralNode } = data
  const display = STRUCTURAL_DISPLAY[structuralNode.structuralType]
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const onResizeEnd = useCallback(
    (_: ResizeDragEvent, params: ResizeParams) => {
      runInAction(() =>
        graphStore.updateStructuralNode(structuralNode.id, {
          width: params.width,
          height: params.height,
          position: { x: params.x, y: params.y },
        }),
      )
    },
    [structuralNode.id],
  )

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (simulationStore.status === SimulationStatus.Idle) return
    e.preventDefault()
    e.stopPropagation()
    setMenu({ x: e.clientX, y: e.clientY })
  }, [])

  const handleFire = useCallback((scenarioId: ChaosScenarioId) => {
    const { position, width, height } = structuralNode
    const nodeIds = graphStore.nodesWithinBounds(position.x, position.y, width, height)
    if (nodeIds.length === 0) return
    runInAction(() => chaosStore.activateScenario(scenarioId, nodeIds, [], {}))
    setMenu(null)
  }, [structuralNode])

  // Close menu on outside click or Escape
  useEffect(() => {
    if (!menu) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(null) }
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as HTMLElement)) setMenu(null)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [menu])

  const vw = window.innerWidth
  const vh = window.innerHeight
  const menuW = 220
  const menuH = 130
  const menuX = menu ? Math.min(menu.x, vw - menuW - 8) : 0
  const menuY = menu ? Math.min(menu.y, vh - menuH - 8) : 0

  return (
    <>
      <NodeResizer
        isVisible={selected}
        minWidth={150}
        minHeight={100}
        onResizeEnd={onResizeEnd}
        lineStyle={{ stroke: '#94a3b8' }}
        handleStyle={{ width: 8, height: 8, background: '#94a3b8', border: '2px solid white' }}
      />

      <div
        className={[
          'w-full h-full rounded-xl border-2 border-dashed relative pointer-events-none',
          display.colorClass,
          display.borderClass,
          selected ? 'border-solid' : '',
        ].join(' ')}
      >
        {/* Invisible overlay — captures right-click for chaos injection */}
        <div
          className="absolute inset-0 pointer-events-auto z-10"
          onContextMenu={handleContextMenu}
        />

        {/* Label badge */}
        <div className="absolute top-2 left-3 flex items-center gap-1.5 pointer-events-none">
          {(() => { const Icon = display.icon; return <Icon size={14} className={display.textClass} strokeWidth={1.8} /> })()}
          <span className={`text-xs font-semibold ${display.textClass}`}>
            {structuralNode.label || display.label}
          </span>
        </div>

        {/* Notes */}
        {structuralNode.notes && (
          <p className="absolute bottom-2 left-3 right-3 text-[10px] text-gray-400 truncate pointer-events-none">
            {structuralNode.notes}
          </p>
        )}
      </div>

      {/* Group chaos context menu — rendered in a portal via fixed positioning */}
      {menu && (
        <div
          ref={menuRef}
          style={{ position: 'fixed', left: menuX, top: menuY, width: menuW, zIndex: 9999 }}
          className="bg-app-surface border border-app-border rounded-xl shadow-2xl shadow-black/60 overflow-hidden"
        >
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-app-border bg-purple-500/5">
            <Zap size={12} className="text-purple-400 shrink-0" strokeWidth={2} />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-purple-300 uppercase tracking-widest">Group Chaos</p>
              <p className="text-[10px] text-app-text-3 truncate">{structuralNode.label || 'Group'}</p>
            </div>
            <button onClick={() => setMenu(null)} className="p-0.5 rounded text-app-text-3 hover:text-app-text shrink-0">
              <X size={12} />
            </button>
          </div>
          <div className="px-2 py-2 flex flex-col gap-1">
            {GROUP_SCENARIOS.map(s => (
              <button
                key={s.id}
                onClick={() => handleFire(s.id)}
                className="w-full flex flex-col gap-0.5 px-2 py-1.5 rounded-lg text-left hover:bg-app-elevated border border-transparent hover:border-purple-500/20 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold font-mono text-red-400">{s.tag}</span>
                  <span className="text-[10px] font-semibold text-app-text">{s.label}</span>
                </div>
                <p className="text-[9px] text-app-text-3">{s.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  )
})

export default StructuralNodeComponent
