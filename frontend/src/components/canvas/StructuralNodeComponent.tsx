import { useCallback } from 'react'
import { NodeResizer, type Node, type NodeProps, type ResizeDragEvent, type ResizeParams } from '@xyflow/react'
import { runInAction } from 'mobx'
import { graphStore } from '../../stores/GraphStore'
import { STRUCTURAL_DISPLAY } from './nodeConfig'
import type { StructuralNode } from '../../types/topology'

export type StructuralRFData = { structuralNode: StructuralNode }
export type StructuralRFNode = Node<StructuralRFData, 'structural'>

export default function StructuralNodeComponent({ data, selected }: NodeProps<StructuralRFNode>) {
  const { structuralNode } = data
  const display = STRUCTURAL_DISPLAY[structuralNode.structuralType]

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
        {/* Label badge */}
        <div className={`absolute top-2 left-3 flex items-center gap-1.5 pointer-events-none`}>
          <span className="text-sm">{display.icon}</span>
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
    </>
  )
}
