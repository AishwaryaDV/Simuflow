/**
 * ChaosContextMenu.tsx
 * Right-click context menu for injecting / removing chaos on nodes and edges.
 * - Node: shows scenarios valid for that node type + "Remove chaos" if active
 * - Edge: shows NET_* scenarios only
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { observer } from 'mobx-react-lite'
import { runInAction } from 'mobx'
import { X, Zap, AlertTriangle } from 'lucide-react'
import { chaosStore, SCENARIO_CATALOGUE } from '../../stores/ChaosStore'
import { graphStore } from '../../stores/GraphStore'
import type { ChaosScenarioDef, NodeType, ChaosCategory } from '../../types/topology'
import { ChaosScenarioId } from '../../types/topology'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ContextMenuTarget {
  type:     'node' | 'edge'
  targetId: string
  nodeType?: NodeType
  x:        number
  y:        number
}

// ── Category colours ──────────────────────────────────────────────────────────

const CAT_COLOR: Record<ChaosCategory, string> = {
  infrastructure: 'text-orange-400',
  network:        'text-blue-400',
  application:    'text-purple-400',
  traffic:        'text-yellow-400',
  dependency:     'text-red-400',
  data:           'text-green-400',
}

// ── Inline config form ────────────────────────────────────────────────────────

function ConfigForm({
  scenario,
  onFire,
  onCancel,
}: {
  scenario:  ChaosScenarioDef
  onFire:    (config: Record<string, unknown>) => void
  onCancel:  () => void
}) {
  const [severity,   setSeverity]   = useState<'mild' | 'moderate' | 'severe'>('moderate')
  const [numValue,   setNumValue]   = useState<number>(
    scenario.configSchema.type === 'percentage'  ? 50 :
    scenario.configSchema.type === 'milliseconds' ? 500 : 0
  )
  const [multiplier, setMultiplier] = useState<number>(
    scenario.configSchema.type === 'multiplier'
      ? (scenario.configSchema as any).options[0]
      : 2
  )

  const fire = useCallback(() => {
    const schema = scenario.configSchema
    if (schema.type === 'none')        onFire({})
    else if (schema.type === 'severity')    onFire({ severity })
    else if (schema.type === 'percentage')  onFire({ cap: numValue })
    else if (schema.type === 'milliseconds') onFire({ value: numValue })
    else if (schema.type === 'multiplier')  onFire({ multiplier })
    else onFire({})
  }, [scenario, severity, numValue, multiplier, onFire])

  const schema = scenario.configSchema

  return (
    <div className="mt-2 pt-2 border-t border-app-border flex flex-col gap-2">
      {schema.type === 'severity' && (
        <div className="flex gap-1">
          {(['mild', 'moderate', 'severe'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSeverity(s)}
              className={[
                'flex-1 text-[10px] font-semibold py-1 rounded-md border capitalize transition-colors',
                severity === s
                  ? 'border-purple-500/60 bg-purple-500/20 text-purple-300'
                  : 'border-app-border text-app-text-3 hover:text-app-text-2',
              ].join(' ')}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {(schema.type === 'percentage' || schema.type === 'milliseconds') && (
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-app-text-3">
            {(schema as any).label}
          </label>
          <input
            type="number"
            value={numValue}
            min={schema.type === 'percentage' ? 1 : 0}
            max={schema.type === 'percentage' ? 99 : undefined}
            onChange={e => setNumValue(Number(e.target.value))}
            className="text-xs border border-app-border bg-app-bg text-app-text rounded-lg px-2.5 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>
      )}

      {schema.type === 'multiplier' && (
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-app-text-3">
            {(schema as any).label}
          </label>
          <div className="flex gap-1">
            {((schema as any).options as number[]).map((opt: number) => (
              <button
                key={opt}
                onClick={() => setMultiplier(opt)}
                className={[
                  'flex-1 text-[10px] font-bold py-1 rounded-md border transition-colors',
                  multiplier === opt
                    ? 'border-purple-500/60 bg-purple-500/20 text-purple-300'
                    : 'border-app-border text-app-text-3 hover:text-app-text-2',
                ].join(' ')}
              >
                {opt}×
              </button>
            ))}
          </div>
        </div>
      )}

      {schema.type === 'group' && (
        <p className="text-[10px] text-app-text-3 italic">
          Right-click a structural group container to target it.
        </p>
      )}

      <div className="flex gap-1.5">
        <button
          onClick={onCancel}
          className="flex-1 text-[10px] font-medium py-1.5 rounded-lg border border-app-border text-app-text-3 hover:text-app-text transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={fire}
          className="flex-1 text-[10px] font-semibold py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-colors flex items-center justify-center gap-1"
        >
          <Zap size={9} strokeWidth={2.5} />
          Fire
        </button>
      </div>
    </div>
  )
}

// ── Scenario row ──────────────────────────────────────────────────────────────

function ScenarioRow({
  scenario,
  onSelect,
  selected,
}: {
  scenario: ChaosScenarioDef
  onSelect: () => void
  selected: boolean
}) {
  const color = CAT_COLOR[scenario.category]
  return (
    <button
      onClick={onSelect}
      className={[
        'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors',
        selected
          ? 'bg-purple-500/15 border border-purple-500/30'
          : 'hover:bg-app-elevated border border-transparent',
      ].join(' ')}
    >
      <span className={`text-[9px] font-bold font-mono shrink-0 ${color}`}>
        {scenario.tag}
      </span>
      <span className="text-[10px] text-app-text-2 leading-tight min-w-0 truncate">
        {scenario.name}
      </span>
    </button>
  )
}

// ── ChaosContextMenu ──────────────────────────────────────────────────────────

interface Props {
  target:  ContextMenuTarget
  onClose: () => void
}

const ChaosContextMenu = observer(({ target, onClose }: Props) => {
  const menuRef = useRef<HTMLDivElement>(null)
  const [selectedScenario, setSelectedScenario] = useState<ChaosScenarioDef | null>(null)

  // Close on outside click or Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [onClose])

  // Filter scenarios for this target
  const scenarios: ChaosScenarioDef[] = target.type === 'edge'
    ? SCENARIO_CATALOGUE.filter(s => s.id.startsWith('NET_'))
    : target.nodeType
      ? chaosStore.validScenariosForNodeType(target.nodeType)
      : []

  // Active chaos on this target
  const activeOnTarget = target.type === 'node'
    ? chaosStore.scenariosForNode(target.targetId)
    : chaosStore.scenariosForEdge(target.targetId)

  const targetLabel = target.type === 'node'
    ? (graphStore.nodes.get(target.targetId)?.label ?? target.targetId)
    : 'Edge'

  const handleFire = useCallback((config: Record<string, unknown>) => {
    if (!selectedScenario) return
    runInAction(() => {
      chaosStore.activateScenario(
        selectedScenario.id as ChaosScenarioId,
        target.type === 'node' ? [target.targetId] : [],
        target.type === 'edge' ? [target.targetId] : [],
        config,
      )
    })
    onClose()
  }, [selectedScenario, target, onClose])

  const handleRemove = useCallback((instanceId: string) => {
    runInAction(() => chaosStore.deactivateScenario(instanceId))
    if (activeOnTarget.length <= 1) onClose()
  }, [activeOnTarget, onClose])

  // Clamp to viewport
  const vw = window.innerWidth
  const vh = window.innerHeight
  const menuW = 240
  const menuH = 380
  const x = Math.min(target.x, vw - menuW - 8)
  const y = Math.min(target.y, vh - menuH - 8)

  if (scenarios.length === 0 && activeOnTarget.length === 0) return null

  return (
    <div
      ref={menuRef}
      style={{ position: 'fixed', left: x, top: y, width: menuW, zIndex: 9999 }}
      className="bg-app-surface border border-app-border rounded-xl shadow-2xl shadow-black/60 flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-app-border bg-purple-500/5">
        <Zap size={12} className="text-purple-400 shrink-0" strokeWidth={2} />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-purple-300 uppercase tracking-widest">Inject Chaos</p>
          <p className="text-[10px] text-app-text-3 truncate">{targetLabel}</p>
        </div>
        <button onClick={onClose} className="p-0.5 rounded text-app-text-3 hover:text-app-text transition-colors shrink-0">
          <X size={12} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar max-h-80 px-2 py-2 flex flex-col gap-1">

        {/* Active chaos — remove section */}
        {activeOnTarget.length > 0 && (
          <div className="mb-1">
            <p className="text-[9px] font-bold uppercase tracking-widest text-app-text-3 px-1 mb-1">Active</p>
            {activeOnTarget.map(active => {
              const def = SCENARIO_CATALOGUE.find(s => s.id === active.scenarioId)
              return (
                <div
                  key={active.id}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg mb-0.5 ${
                    active.severity === 'red' ? 'bg-red-500/10 border border-red-500/20' : 'bg-orange-500/10 border border-orange-500/20'
                  }`}
                >
                  <AlertTriangle size={10} className={active.severity === 'red' ? 'text-red-400' : 'text-orange-400'} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-app-text truncate">{def?.name ?? active.scenarioId}</p>
                    <p className={`text-[9px] font-bold ${active.severity === 'red' ? 'text-red-400' : 'text-orange-400'}`}>
                      {active.impactLabel}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemove(active.id)}
                    className="p-0.5 rounded text-app-text-3 hover:text-red-400 transition-colors shrink-0"
                    title="Remove chaos"
                  >
                    <X size={11} />
                  </button>
                </div>
              )
            })}
            {scenarios.length > 0 && <div className="h-px bg-app-border my-1.5" />}
          </div>
        )}

        {/* Inject scenarios */}
        {scenarios.length > 0 && (
          <>
            <p className="text-[9px] font-bold uppercase tracking-widest text-app-text-3 px-1 mb-0.5">Inject</p>
            {scenarios.map(s => (
              <div key={s.id}>
                <ScenarioRow
                  scenario={s}
                  selected={selectedScenario?.id === s.id}
                  onSelect={() => setSelectedScenario(prev => prev?.id === s.id ? null : s)}
                />
                {selectedScenario?.id === s.id && (
                  <div className="px-2 pb-1">
                    <ConfigForm
                      scenario={s}
                      onFire={handleFire}
                      onCancel={() => setSelectedScenario(null)}
                    />
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
})

export default ChaosContextMenu
