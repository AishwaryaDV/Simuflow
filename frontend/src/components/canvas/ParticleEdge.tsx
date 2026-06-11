import { observer } from 'mobx-react-lite'
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from '@xyflow/react'
import { simulationStore } from '../../stores/SimulationStore'
import { graphStore } from '../../stores/GraphStore'
import { NodeHealth } from '../../types/topology'

function Particle({ path, duration, delay, color, reverse }: {
  path: string; duration: number; delay: number; color: string; reverse?: boolean
}) {
  return (
    <circle r={2.5} fill={color} opacity={0.9}>
      <animateMotion
        dur={`${duration}s`}
        begin={`${delay}s`}
        repeatCount="indefinite"
        path={path}
        keyPoints={reverse ? '1;0' : '0;1'}
        keyTimes="0;1"
        calcMode="linear"
      />
    </circle>
  )
}

const ParticleEdge = observer(({
  id,
  sourceX, sourceY, sourcePosition,
  targetX, targetY, targetPosition,
  label,
  markerEnd,
  selected,
}: EdgeProps) => {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
    borderRadius: 12,
  })

  const edgeMeta = graphStore.edges.get(id)
  const isBidirectional = edgeMeta?.bidirectional ?? false

  const flow          = simulationStore.edgeFlows.get(id)
  const isPartitioned = flow?.isPartitioned ?? false
  const isActive      = simulationStore.isRunning && !!flow && flow.throughput > 0 && !isPartitioned
  const count         = isActive ? Math.max(1, flow!.particleCount) : 0
  const hasError      = (flow?.errorRatio ?? 0) > 0.1

  // Speed = health state (dominant) + slight throughput nudge within each tier
  const targetId     = edgeMeta?.targetId
  const targetHealth = targetId ? simulationStore.nodeStates.get(targetId)?.health : undefined
  const throughput   = flow?.throughput ?? 0
  const tpNudge = Math.min(0.4, throughput / 2500)
  const baseDur = !isActive ? 3
    : targetHealth === NodeHealth.Bottleneck || targetHealth === NodeHealth.Failed
      ? Math.max(0.9, 1.2 - tpNudge)
    : targetHealth === NodeHealth.Stressed
      ? Math.max(1.4, 1.8 - tpNudge)
    : Math.max(2.0, 2.5 - tpNudge)

  const partColor = hasError ? '#f87171' : '#a78bfa'

  const strokeColor = isPartitioned ? '#ef4444'
    : selected  ? '#8b5cf6'
    : isActive  ? (hasError ? '#7f1d1d' : '#3b1f6e')
    : '#2a2a3d'

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        markerStart={isBidirectional ? markerEnd : undefined}
        style={{
          stroke:          strokeColor,
          strokeWidth:     isPartitioned ? 2 : selected || isActive ? 1.5 : 1,
          strokeDasharray: isPartitioned ? '5 4' : undefined,
          transition:      'stroke 0.3s',
        }}
      />

      {/* Partition badge */}
      {isPartitioned && (
        <EdgeLabelRenderer>
          <div
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)` }}
            className="absolute pointer-events-none bg-red-950 text-red-400 text-[9px] font-bold px-1.5 py-0.5 rounded border border-red-500/40 tracking-widest"
          >
            PARTITION
          </div>
        </EdgeLabelRenderer>
      )}

      {/* Forward particles */}
      {isActive && Array.from({ length: count }, (_, i) => (
        <Particle
          key={`f-${i}`}
          path={edgePath}
          duration={baseDur}
          delay={(i / count) * baseDur}
          color={partColor}
        />
      ))}

      {/* Reverse particles when bidirectional */}
      {isActive && isBidirectional && Array.from({ length: count }, (_, i) => (
        <Particle
          key={`r-${i}`}
          path={edgePath}
          duration={baseDur}
          delay={(i / count) * baseDur}
          color={partColor}
          reverse
        />
      ))}

      {label && (
        <EdgeLabelRenderer>
          <div
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)` }}
            className="absolute pointer-events-none bg-app-elevated text-app-text-3 text-[10px] px-1 py-0.5 rounded border border-app-border"
          >
            {String(label)}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
})

export default ParticleEdge
