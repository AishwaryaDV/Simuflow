import { useCallback } from 'react'
import { runInAction } from 'mobx'
import { NodeType } from '../../types/topology'
import type { PresetBlueprint } from '../../types/topology'
import { NODE_DISPLAY } from '../canvas/nodeConfig'
import { graphStore } from '../../stores/GraphStore'

// ── Preset imports ───────────────────────────────────────────────────────────
import webApp from '../../presets/web_app.json'
import cachedWebApp from '../../presets/cached_web_app.json'
import microservices from '../../presets/microservices.json'
import queueSystem from '../../presets/queue_system.json'

const PRESETS: PresetBlueprint[] = [
  webApp as PresetBlueprint,
  cachedWebApp as PresetBlueprint,
  microservices as PresetBlueprint,
  queueSystem as PresetBlueprint,
]

const NODE_TYPES = Object.values(NodeType)

// ── Draggable node card ──────────────────────────────────────────────────────

function NodeCard({ nodeType }: { nodeType: NodeType }) {
  const display = NODE_DISPLAY[nodeType]

  const onDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.setData('application/simuflow-node-type', nodeType)
    e.dataTransfer.effectAllowed = 'copy'
  }, [nodeType])

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={[
        'flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-grab active:cursor-grabbing',
        'hover:shadow-sm transition-shadow',
        display.colorClass,
        display.borderClass,
      ].join(' ')}
      title={display.description}
    >
      <span className="text-base shrink-0">{display.icon}</span>
      <div className="min-w-0">
        <p className={`text-xs font-semibold ${display.textClass} truncate`}>{display.label}</p>
        <p className="text-[10px] text-gray-400 truncate">{display.description}</p>
      </div>
    </div>
  )
}

// ── Preset card ──────────────────────────────────────────────────────────────

function PresetCard({ preset }: { preset: PresetBlueprint }) {
  const handleLoad = useCallback(() => {
    if (graphStore.nodeCount > 0 && !confirm(`Load "${preset.name}"? Current canvas will be replaced.`)) return
    runInAction(() => graphStore.loadTopology(preset.topology, undefined, preset.name))
  }, [preset])

  return (
    <div className="flex flex-col gap-1.5 px-3 py-2.5 rounded-lg border border-gray-200 bg-white hover:border-indigo-300 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-gray-800 leading-tight">{preset.name}</p>
        <button
          onClick={handleLoad}
          className="shrink-0 text-[10px] font-semibold bg-indigo-600 text-white rounded px-2 py-0.5 hover:bg-indigo-700 transition-colors"
        >
          Load
        </button>
      </div>
      <p className="text-[10px] text-gray-500 leading-relaxed">{preset.description}</p>
    </div>
  )
}

// ── NodeLibrary ──────────────────────────────────────────────────────────────

export default function NodeLibrary() {
  return (
    <aside className="w-72 bg-gray-50 border-r border-gray-200 flex flex-col overflow-hidden shrink-0">
      {/* Components */}
      <div className="px-4 pt-4 pb-2 shrink-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Components</p>
        <div className="flex flex-col gap-1.5">
          {NODE_TYPES.map(type => (
            <NodeCard key={type} nodeType={type} />
          ))}
        </div>
      </div>

      <div className="mx-4 my-1 h-px bg-gray-200 shrink-0" />

      {/* Presets */}
      <div className="px-4 pt-2 pb-4 flex-1 overflow-y-auto">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Presets</p>
        <div className="flex flex-col gap-2">
          {PRESETS.map(preset => (
            <PresetCard key={preset.slug} preset={preset} />
          ))}
        </div>
      </div>
    </aside>
  )
}
