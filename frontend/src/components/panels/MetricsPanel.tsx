import { useState } from 'react'
import { observer } from 'mobx-react-lite'
import { runInAction } from 'mobx'
import {
  AreaChart, Area, ResponsiveContainer, Tooltip,
} from 'recharts'
import { ChevronUp, ChevronDown, AlertTriangle, DollarSign, TrendingUp } from 'lucide-react'
import { simulationStore } from '../../stores/SimulationStore'
import { costStore } from '../../stores/CostStore'
import { graphStore } from '../../stores/GraphStore'
import { SimulationStatus } from '../../types/topology'

// ── Sparkline ──────────────────────────────────────────────────────────────────

function Sparkline({ data, dataKey, color, label, value, unit }: {
  data: object[]
  dataKey: string
  color: string
  label: string
  value: string
  unit?: string
}) {
  return (
    <div className="flex flex-col gap-1 flex-1 min-w-0">
      <div className="flex items-baseline justify-between gap-1">
        <span className="text-[10px] font-medium uppercase tracking-widest text-app-text-3">{label}</span>
        <span className="text-sm font-bold text-app-text tabular-nums">
          {value}<span className="text-[10px] text-app-text-3 ml-0.5">{unit}</span>
        </span>
      </div>
      <div className="h-12">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={1.5}
              fill={`url(#grad-${dataKey})`}
              dot={false}
              isAnimationActive={false}
            />
            <Tooltip
              contentStyle={{
                background: '#1a1a2e', border: '1px solid #2a2a4a',
                borderRadius: 8, fontSize: 11, padding: '4px 8px',
              }}
              labelStyle={{ display: 'none' }}
              formatter={(v: number) => [`${Math.round(v)}${unit ?? ''}`, label]}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ── Latency stat ───────────────────────────────────────────────────────────────

function LatencyStat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-app-text-3 font-medium">{label}</span>
      <span className={`text-xs font-bold tabular-nums ${warn ? 'text-orange-400' : 'text-app-text'}`}>
        {value > 0 ? `${value}ms` : '—'}
      </span>
    </div>
  )
}

// ── MetricsPanel ───────────────────────────────────────────────────────────────

const MetricsPanel = observer(() => {
  const [metricsOpen, setMetricsOpen] = useState(true)
  const [costOpen, setCostOpen] = useState(true)
  const { status, globalMetrics, metricsHistory, bottleneckNodes } = simulationStore

  if (status === SimulationStatus.Idle) return null

  // Last 120 snapshots (~24s at 200ms interval) for sparklines
  const chartData = metricsHistory.slice(-120).map(s => ({
    throughput: Math.round(s.throughput),
    errorPct:   parseFloat((s.errorRate * 100).toFixed(2)),
    p50:        s.p50LatencyMs,
  }))

  const bottleneckLabels = bottleneckNodes
    .map(id => graphStore.nodes.get(id)?.label ?? id)
    .join(', ')

  const rate  = costStore.currentRatePerHr
  const spent = costStore.spentUsd
  const pct   = costStore.spentPct
  const over  = costStore.isOverBudget

  const fmtUsd = (v: number) =>
    v < 0.01 ? `$${(v * 100).toFixed(3)}¢` : `$${v.toFixed(v < 10 ? 3 : 2)}`

  return (
    <div className="border-t border-app-border bg-app-surface shrink-0">

      {/* ── Metrics strip ──────────────────────────────────────────────────── */}
      <button
        onClick={() => setMetricsOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-1.5 hover:bg-app-elevated/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <TrendingUp size={11} className="text-app-text-3" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-app-text-3">Metrics</span>
          </div>

          {!metricsOpen && bottleneckLabels && (
            <div className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/30 rounded-full px-2 py-0.5">
              <AlertTriangle size={10} className="text-orange-400 shrink-0" />
              <span className="text-[10px] text-orange-400 font-medium">Bottleneck: {bottleneckLabels}</span>
            </div>
          )}
        </div>
        {metricsOpen ? <ChevronDown size={13} className="text-app-text-3" /> : <ChevronUp size={13} className="text-app-text-3" />}
      </button>

      {metricsOpen && (
        <div className="px-4 pb-3">

          {bottleneckLabels && (
            <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 rounded-lg px-3 py-1.5 mb-3">
              <AlertTriangle size={12} className="text-orange-400 shrink-0" />
              <span className="text-xs text-orange-400 font-medium">
                Bottleneck: <span className="font-bold">{bottleneckLabels}</span>
              </span>
            </div>
          )}

          <div className="flex gap-4 items-start">

            <Sparkline
              data={chartData}
              dataKey="throughput"
              color="#8b5cf6"
              label="Throughput"
              value={
                globalMetrics.throughput >= 1000
                  ? `${(globalMetrics.throughput / 1000).toFixed(1)}k`
                  : String(Math.round(globalMetrics.throughput))
              }
              unit=" req/s"
            />

            <div className="w-px self-stretch bg-app-border shrink-0" />

            <Sparkline
              data={chartData}
              dataKey="errorPct"
              color="#f87171"
              label="Error rate"
              value={(globalMetrics.errorRate * 100).toFixed(1)}
              unit="%"
            />

            <div className="w-px self-stretch bg-app-border shrink-0" />

            <div className="flex flex-col gap-1.5 shrink-0 w-36">
              <span className="text-[10px] font-medium uppercase tracking-widest text-app-text-3">Latency</span>
              <div className="flex flex-col gap-1.5 mt-0.5">
                <LatencyStat label="p50" value={globalMetrics.p50LatencyMs} />
                <LatencyStat label="p95" value={globalMetrics.p95LatencyMs} warn={globalMetrics.p95LatencyMs > 500} />
                <LatencyStat label="p99" value={globalMetrics.p99LatencyMs} warn={globalMetrics.p99LatencyMs > 1000} />
              </div>
            </div>

            <div className="w-px self-stretch bg-app-border shrink-0" />

            <div className="flex flex-col gap-1.5 shrink-0 w-28">
              <span className="text-[10px] font-medium uppercase tracking-widest text-app-text-3">System health</span>
              <div className="flex items-end gap-1 mt-1">
                <span className={`text-2xl font-bold tabular-nums leading-none ${
                  simulationStore.systemHealthScore > 70 ? 'text-green-400'
                  : simulationStore.systemHealthScore > 40 ? 'text-yellow-400'
                  : 'text-red-400'
                }`}>
                  {Math.round(simulationStore.systemHealthScore)}
                </span>
                <span className="text-[10px] text-app-text-3 mb-0.5">/ 100</span>
              </div>
              <div className="h-1.5 bg-app-elevated rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    simulationStore.systemHealthScore > 70 ? 'bg-green-400'
                    : simulationStore.systemHealthScore > 40 ? 'bg-yellow-400'
                    : 'bg-red-400'
                  }`}
                  style={{ width: `${simulationStore.systemHealthScore}%` }}
                />
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── Cost strip ─────────────────────────────────────────────────────── */}
      <div className="border-t border-app-border/60">
        <button
          onClick={() => setCostOpen(v => !v)}
          className="w-full flex items-center justify-between px-4 py-1.5 hover:bg-app-elevated/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <DollarSign size={11} className="text-app-text-3" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-app-text-3">Cost</span>
            </div>

            {/* Inline summary when collapsed */}
            {!costOpen && (
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-app-text-2 tabular-nums">
                  <span className="text-app-text-3">Rate </span>{fmtUsd(rate)}/hr
                </span>
                <span className="text-[10px] text-app-text-2 tabular-nums">
                  <span className="text-app-text-3">Spent </span>{fmtUsd(spent)}
                </span>
                {over && (
                  <span className="text-[10px] text-red-400 font-semibold">Over budget</span>
                )}
              </div>
            )}
          </div>
          {costOpen ? <ChevronDown size={13} className="text-app-text-3" /> : <ChevronUp size={13} className="text-app-text-3" />}
        </button>

        {costOpen && (
          <div className="px-4 pb-3 flex items-start gap-6">

            {/* Rate */}
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-medium uppercase tracking-widest text-app-text-3">Rate</span>
              <span className="text-lg font-bold tabular-nums text-app-text leading-none">
                {fmtUsd(rate)}
              </span>
              <span className="text-[10px] text-app-text-3">per hour</span>
            </div>

            <div className="w-px self-stretch bg-app-border shrink-0" />

            {/* Spent */}
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-medium uppercase tracking-widest text-app-text-3">SIM Spent</span>
              <span className={`text-lg font-bold tabular-nums leading-none ${over ? 'text-red-400' : 'text-app-text'}`}>
                {fmtUsd(spent)}
              </span>
              <span className="text-[10px] text-app-text-3">simulated time</span>
            </div>

            <div className="w-px self-stretch bg-app-border shrink-0" />

            {/* Budget + progress */}
            <div className="flex flex-col gap-1.5 min-w-40">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium uppercase tracking-widest text-app-text-3">Budget</span>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-app-text-3">$</span>
                  <input
                    type="number"
                    value={costStore.budgetUsd}
                    min={0.01}
                    step={1}
                    onChange={e => {
                      const v = parseFloat(e.target.value)
                      if (!isNaN(v) && v > 0) runInAction(() => costStore.setBudget(v))
                    }}
                    className="w-14 text-xs font-bold text-app-text bg-app-elevated border border-app-border rounded px-1.5 py-0.5 text-right tabular-nums focus:outline-none focus:ring-1 focus:ring-app-accent"
                  />
                </div>
              </div>
              <div className="h-2 bg-app-elevated rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    over ? 'bg-red-400' : pct > 75 ? 'bg-orange-400' : 'bg-green-400'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-app-text-3 tabular-nums">{pct.toFixed(1)}% used</span>
                {over && <span className="text-[10px] text-red-400 font-semibold">Over budget!</span>}
              </div>
            </div>

            <div className="w-px self-stretch bg-app-border shrink-0" />

            {/* Top cost contributors */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-medium uppercase tracking-widest text-app-text-3">Top costs</span>
              {costStore.topCostNodes.length === 0 ? (
                <span className="text-[10px] text-app-text-3 italic">No billable nodes</span>
              ) : (
                <div className="flex flex-col gap-1">
                  {costStore.topCostNodes.map(n => (
                    <div key={n.label} className="flex items-center justify-between gap-4">
                      <span className="text-[10px] text-app-text-2 truncate max-w-24">{n.label}</span>
                      <span className="text-[10px] font-bold tabular-nums text-app-text shrink-0">
                        {fmtUsd(n.rateHr)}/hr
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  )
})

export default MetricsPanel
