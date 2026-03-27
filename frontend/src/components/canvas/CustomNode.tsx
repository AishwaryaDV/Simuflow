import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { observer } from 'mobx-react-lite'
import { NodeHealth } from '../../types/topology'
import type { SimNode } from '../../types/topology'
import { simulationStore } from '../../stores/SimulationStore'
import { NODE_DISPLAY } from './nodeConfig'

export type CustomNodeData = { simNode: SimNode }
export type CustomNodeType = Node<CustomNodeData, 'custom'>

const HEALTH_RING: Record<NodeHealth, string> = {
  [NodeHealth.Idle]:       'ring-gray-300',
  [NodeHealth.Healthy]:    'ring-green-400',
  [NodeHealth.Stressed]:   'ring-yellow-400',
  [NodeHealth.Bottleneck]: 'ring-red-500',
  [NodeHealth.Failed]:     'ring-red-700',
}

const handleStyle = { width: 8, height: 8, background: '#94a3b8', border: '2px solid #e2e8f0' }

const CustomNode = observer(({ data, selected }: NodeProps<CustomNodeType>) => {
  const { simNode } = data
  const display = NODE_DISPLAY[simNode.nodeType]
  const runtime = simulationStore.nodeStates.get(simNode.id)
  const health = runtime?.health ?? NodeHealth.Idle
  const ringClass = HEALTH_RING[health]

  return (
    <div
      className={[
        'relative flex flex-col items-center justify-center',
        'w-24 h-20 rounded-xl border-2',
        display.colorClass,
        display.borderClass,
        'ring-2',
        ringClass,
        selected ? 'shadow-lg shadow-blue-200 scale-105' : '',
        'transition-shadow transition-transform duration-150 cursor-pointer select-none',
      ].join(' ')}
    >
      {/* Handles — top + left as targets, bottom + right as sources */}
      <Handle id="top"    type="target" position={Position.Top}    style={handleStyle} />
      <Handle id="left"   type="target" position={Position.Left}   style={handleStyle} />
      <Handle id="bottom" type="source" position={Position.Bottom} style={handleStyle} />
      <Handle id="right"  type="source" position={Position.Right}  style={handleStyle} />

      <span className="text-xl leading-none">{display.icon}</span>
      <span className={`mt-1 text-[11px] font-semibold ${display.textClass} truncate max-w-[88px] px-1 text-center leading-tight`}>
        {simNode.label}
      </span>

      {/* Utilisation chip — visible only during simulation */}
      {runtime && (
        <span className="absolute -top-2.5 -right-2.5 bg-gray-800 text-white text-[9px] font-bold rounded-full px-1 py-0.5 leading-none">
          {Math.round(runtime.utilisationPct)}%
        </span>
      )}
    </div>
  )
})

export default CustomNode
