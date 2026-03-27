import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react'

/** Phase 1: static bezier edge. Phase 2 will animate particles along this path. */
export default function ParticleEdge({
  id,
  sourceX, sourceY, sourcePosition,
  targetX, targetY, targetPosition,
  label,
  markerEnd,
  selected,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  })

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: selected ? '#6366f1' : '#94a3b8',
          strokeWidth: selected ? 2.5 : 1.5,
        }}
      />

      {label && (
        <EdgeLabelRenderer>
          <div
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)` }}
            className="absolute pointer-events-none bg-white/80 text-gray-500 text-[10px] px-1 py-0.5 rounded border border-gray-200"
          >
            {String(label)}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
