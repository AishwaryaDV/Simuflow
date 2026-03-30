import { observer } from 'mobx-react-lite'
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from '@xyflow/react'
import { simulationStore } from '../../stores/SimulationStore'
import { graphStore } from '../../stores/GraphStore'
import { NodeHealth } from '../../types/topology'

function Particle({ path, duration, delay, color }: {
  path: string; duration: number; delay: number; color: string
}) {
  return (
    <circle r={2.5} fill={color} opacity={0.9}>
      <animateMotion
        dur={`${duration}s`}
        begin={`${delay}s`}
        repeatCount="indefinite"
        path={path}
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

  const flow     = simulationStore.edgeFlows.get(id)
  const isActive = simulationStore.isRunning && !!flow && flow.throughput > 0
  const count    = isActive ? Math.max(1, flow!.particleCount) : 0
  const hasError = (flow?.errorRatio ?? 0) > 0.1

  // Speed = health state (dominant) + slight throughput nudge within each tier
  const targetId     = graphStore.edges.get(id)?.targetId
  const targetHealth = targetId ? simulationStore.nodeStates.get(targetId)?.health : undefined
  const throughput   = flow?.throughput ?? 0
  // Throughput nudge: up to 0.4s faster at high RPS, within each health band
  const tpNudge = Math.min(0.4, throughput / 2500)
  const baseDur = !isActive ? 3
    : targetHealth === NodeHealth.Bottleneck || targetHealth === NodeHealth.Failed
      ? Math.max(0.9, 1.2 - tpNudge)
    : targetHealth === NodeHealth.Stressed
      ? Math.max(1.4, 1.8 - tpNudge)
    : Math.max(2.0, 2.5 - tpNudge)

  const partColor= hasError ? '#f87171' : '#a78bfa'

  const strokeColor = selected
    ? '#8b5cf6'
    : isActive ? (hasError ? '#7f1d1d' : '#3b1f6e') : '#2a2a3d'

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: strokeColor,
          strokeWidth: selected || isActive ? 1.5 : 1,
          transition: 'stroke 0.3s',
        }}
      />

      {isActive && Array.from({ length: count }, (_, i) => (
        <Particle
          key={i}
          path={edgePath}
          duration={baseDur}
          delay={(i / count) * baseDur}
          color={partColor}
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
