import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { observer } from 'mobx-react-lite'
import { NodeHealth } from '../../types/topology'
import type { SimNode } from '../../types/topology'
import { simulationStore } from '../../stores/SimulationStore'
import { NODE_DISPLAY } from './nodeConfig'

export type CustomNodeData = { simNode: SimNode }
export type CustomNodeType = Node<CustomNodeData, 'custom'>

const HEALTH_RING: Record<NodeHealth, string> = {
  [NodeHealth.Idle]:       'ring-transparent',
  [NodeHealth.Healthy]:    'ring-green-500',
  [NodeHealth.Stressed]:   'ring-yellow-400',
  [NodeHealth.Bottleneck]: 'ring-red-500',
  [NodeHealth.Failed]:     'ring-red-700',
}

const handleStyle = { width: 8, height: 8, background: '#4c4870', border: '2px solid #2a2a3d' }

const CustomNode = observer(({ data, selected }: NodeProps<CustomNodeType>) => {
  const { simNode } = data
  const display = NODE_DISPLAY[simNode.nodeType]
  const runtime = simulationStore.nodeStates.get(simNode.id)
  const health = runtime?.health ?? NodeHealth.Idle
  const ringClass = HEALTH_RING[health]

  const Icon = display.icon

  return (
    <div className="flex flex-col items-center gap-1.5 cursor-pointer select-none">
      {/* Node box — icon only */}
      <div
        className={[
          'relative flex items-center justify-center',
          'w-14 h-14 rounded-2xl border',
          display.colorClass,
          display.borderClass,
          'ring-2',
          ringClass,
          selected ? 'shadow-lg shadow-app-accent/30 scale-105' : '',
          'transition-all duration-150',
        ].join(' ')}
      >
        <Handle id="top"    type="target" position={Position.Top}    style={handleStyle} />
        <Handle id="left"   type="target" position={Position.Left}   style={handleStyle} />
        <Handle id="bottom" type="source" position={Position.Bottom} style={handleStyle} />
        <Handle id="right"  type="source" position={Position.Right}  style={handleStyle} />

        <Icon size={22} className={display.textClass} strokeWidth={1.8} />

        {/* Utilisation chip */}
        {runtime && (
          <span className="absolute -top-2 -right-2 bg-app-elevated border border-app-border text-app-text text-[9px] font-bold rounded-full px-1 py-0.5 leading-none">
            {Math.round(runtime.utilisationPct)}%
          </span>
        )}
      </div>

      {/* Label below */}
      <span className="text-[11px] font-semibold text-white/90 truncate max-w-[100px] text-center leading-tight">
        {simNode.label}
      </span>
    </div>
  )
})

export default CustomNode
