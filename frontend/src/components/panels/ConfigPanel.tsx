import { observer } from 'mobx-react-lite'
import { runInAction } from 'mobx'
import { graphStore } from '../../stores/GraphStore'
import { NodeType, LBStrategy } from '../../types/topology'
import type { SimNode, BaseNodeConfig, ClientConfig, LoadBalancerConfig, CacheConfig, CDNConfig, QueueConfig } from '../../types/topology'
import { NODE_DISPLAY } from '../canvas/nodeConfig'

// ── Shared field components ──────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
      {children}
    </label>
  )
}

function NumInput({
  value, onChange, min, max, step,
}: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step ?? 1}
      onChange={e => onChange(Number(e.target.value))}
      className="text-sm border border-gray-200 rounded-md px-2 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-indigo-300"
    />
  )
}

function RangeInput({
  value, onChange, min = 0, max = 1, step = 0.01, format,
}: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; format?: (v: number) => string
}) {
  const display = format ? format(value) : `${Math.round(value * 100)}%`
  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={e => onChange(Number(e.target.value))}
        className="flex-1 accent-indigo-500"
      />
      <span className="text-xs text-gray-600 w-12 text-right">{display}</span>
    </div>
  )
}

// ── Type-specific config sections ────────────────────────────────────────────

function BaseFields({ node, cfg }: { node: SimNode; cfg: BaseNodeConfig }) {
  const patch = (partial: Partial<BaseNodeConfig>) =>
    runInAction(() => graphStore.updateNodeConfig(node.id, { config: { ...cfg, ...partial } } as any))

  return (
    <>
      <Field label="Capacity (req/s)">
        <NumInput value={cfg.capacity} onChange={v => patch({ capacity: v })} min={1} />
      </Field>
      <Field label="Latency p50 (ms)">
        <NumInput value={cfg.latencyMs} onChange={v => patch({ latencyMs: v })} min={0} />
      </Field>
      <Field label="Failure rate">
        <RangeInput value={cfg.failureRate} onChange={v => patch({ failureRate: v })} />
      </Field>
      <Field label="Timeout (ms)">
        <NumInput value={cfg.timeoutMs} onChange={v => patch({ timeoutMs: v })} min={100} step={100} />
      </Field>
    </>
  )
}

function ClientFields({ node, cfg }: { node: SimNode; cfg: ClientConfig }) {
  const patch = (partial: Partial<ClientConfig>) =>
    runInAction(() => graphStore.updateNodeConfig(node.id, { config: { ...cfg, ...partial } } as any))

  return (
    <>
      <Field label="Requests/sec">
        <NumInput value={cfg.rps} onChange={v => patch({ rps: v })} min={1} />
      </Field>
      <Field label="Burst mode">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={cfg.burst}
            onChange={e => patch({ burst: e.target.checked })}
            className="accent-indigo-500 w-4 h-4"
          />
          <span className="text-sm text-gray-700">Simulate burst traffic</span>
        </label>
      </Field>
    </>
  )
}

function LBFields({ node, cfg }: { node: SimNode; cfg: LoadBalancerConfig }) {
  const patch = (partial: Partial<LoadBalancerConfig>) =>
    runInAction(() => graphStore.updateNodeConfig(node.id, { config: { ...cfg, ...partial } } as any))

  return (
    <>
      <Field label="Strategy">
        <select
          value={cfg.strategy}
          onChange={e => patch({ strategy: e.target.value as LBStrategy })}
          className="text-sm border border-gray-200 rounded-md px-2 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-indigo-300"
        >
          <option value={LBStrategy.RoundRobin}>Round Robin</option>
          <option value={LBStrategy.LeastConnections}>Least Connections</option>
          <option value={LBStrategy.Random}>Random</option>
        </select>
      </Field>
      <Field label="Replicas">
        <NumInput value={cfg.replicas} onChange={v => patch({ replicas: v })} min={1} max={32} />
      </Field>
      <BaseFields node={node} cfg={cfg} />
    </>
  )
}

function CacheFields({ node, cfg }: { node: SimNode; cfg: CacheConfig }) {
  const patch = (partial: Partial<CacheConfig>) =>
    runInAction(() => graphStore.updateNodeConfig(node.id, { config: { ...cfg, ...partial } } as any))

  return (
    <>
      <Field label="Hit rate">
        <RangeInput value={cfg.hitRate} onChange={v => patch({ hitRate: v })} />
      </Field>
      <BaseFields node={node} cfg={cfg} />
    </>
  )
}

function QueueFields({ node, cfg }: { node: SimNode; cfg: QueueConfig }) {
  const patch = (partial: Partial<QueueConfig>) =>
    runInAction(() => graphStore.updateNodeConfig(node.id, { config: { ...cfg, ...partial } } as any))

  return (
    <>
      <Field label="Message delay (ms)">
        <NumInput value={cfg.delayMs} onChange={v => patch({ delayMs: v })} min={0} />
      </Field>
      <Field label="Max depth (0 = unlimited)">
        <NumInput value={cfg.maxDepth} onChange={v => patch({ maxDepth: v })} min={0} />
      </Field>
    </>
  )
}

// ── Main ConfigPanel ─────────────────────────────────────────────────────────

const ConfigPanel = observer(() => {
  const nodeId = graphStore.selectedNodeId
  const node = nodeId ? graphStore.nodes.get(nodeId) : null

  if (!node) {
    return (
      <aside className="w-80 bg-white border-l border-gray-200 flex flex-col items-center justify-center text-center p-6 shrink-0">
        <span className="text-3xl mb-3">🖱️</span>
        <p className="text-sm text-gray-500">Click a node to configure it</p>
      </aside>
    )
  }

  const display = NODE_DISPLAY[node.nodeType]

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    runInAction(() => graphStore.updateNodeConfig(node.id, { label: e.target.value } as any))

  const handleDelete = () =>
    runInAction(() => graphStore.removeNode(node.id))

  function renderConfigFields() {
    switch (node!.nodeType) {
      case NodeType.Client:
        return <ClientFields node={node!} cfg={node!.config as ClientConfig} />
      case NodeType.LoadBalancer:
        return <LBFields node={node!} cfg={node!.config as LoadBalancerConfig} />
      case NodeType.Cache:
        return <CacheFields node={node!} cfg={node!.config as CacheConfig} />
      case NodeType.CDN:
        return <CacheFields node={node!} cfg={node!.config as CDNConfig} />
      case NodeType.Queue:
        return <QueueFields node={node!} cfg={node!.config as QueueConfig} />
      default:
        return <BaseFields node={node!} cfg={node!.config as BaseNodeConfig} />
    }
  }

  return (
    <aside className="w-80 bg-white border-l border-gray-200 flex flex-col shrink-0 overflow-hidden">
      {/* Header */}
      <div className={`px-4 py-3 border-b border-gray-200 flex items-center gap-2 ${display.colorClass}`}>
        <span className="text-lg">{display.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{display.label}</p>
          <p className="text-xs text-gray-500 truncate">{node.id}</p>
        </div>
        <button
          onClick={handleDelete}
          className="text-red-400 hover:text-red-600 p-1 rounded transition-colors"
          title="Delete node"
        >
          🗑️
        </button>
      </div>

      {/* Scrollable fields */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        <Field label="Label">
          <input
            type="text"
            value={node.label}
            onChange={handleLabelChange}
            maxLength={40}
            className="text-sm border border-gray-200 rounded-md px-2 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-indigo-300"
          />
        </Field>

        <div className="w-full h-px bg-gray-100" />

        {renderConfigFields()}
      </div>
    </aside>
  )
})

export default ConfigPanel
