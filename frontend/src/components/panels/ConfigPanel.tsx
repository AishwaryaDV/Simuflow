import { observer } from 'mobx-react-lite'
import { runInAction } from 'mobx'
import { graphStore } from '../../stores/GraphStore'
import {
  NodeType, LBStrategy, RateLimitAlgorithm, RejectBehavior,
} from '../../types/topology'
import type {
  BaseNodeConfig, ClientConfig, LoadBalancerConfig, CacheConfig, CDNConfig, QueueConfig,
  ApiGatewayConfig, ServerlessConfig, WorkerConfig, PubSubConfig, StreamConfig,
  RateLimiterConfig, ObjectStoreConfig, ExternalServiceConfig, LLMGatewayConfig,
  VectorDBConfig, AgentOrchestratorConfig,
} from '../../types/topology'
import { NODE_DISPLAY, STRUCTURAL_DISPLAY } from '../canvas/nodeConfig'

// ── Shared field primitives ───────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
      {children}
      {hint && <span className="text-[10px] text-gray-400">{hint}</span>}
    </label>
  )
}

function NumInput({ value, onChange, min, max, step }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number
}) {
  return (
    <input type="number" value={value} min={min} max={max} step={step ?? 1}
      onChange={e => onChange(Number(e.target.value))}
      className="text-sm border border-gray-200 rounded-md px-2 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-indigo-300" />
  )
}

function RangeInput({ value, onChange, min = 0, max = 1, step = 0.01, format }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; format?: (v: number) => string
}) {
  const display = format ? format(value) : `${Math.round(value * 100)}%`
  return (
    <div className="flex items-center gap-2">
      <input type="range" value={value} min={min} max={max} step={step}
        onChange={e => onChange(Number(e.target.value))}
        className="flex-1 accent-indigo-500" />
      <span className="text-xs text-gray-600 w-14 text-right">{display}</span>
    </div>
  )
}

function Select<T extends string>({ value, onChange, options }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: string }[]
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value as T)}
      className="text-sm border border-gray-200 rounded-md px-2 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-indigo-300">
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function Divider() {
  return <div className="w-full h-px bg-gray-100" />
}

// ── Reusable base config block ────────────────────────────────────────────────

function BaseFields({ nodeId, cfg }: { nodeId: string; cfg: BaseNodeConfig }) {
  const patch = (p: Partial<BaseNodeConfig>) =>
    runInAction(() => graphStore.updateNodeConfig(nodeId, { config: { ...cfg, ...p } } as any))
  return (
    <>
      <Field label="Capacity (req/s)"><NumInput value={cfg.capacity} onChange={v => patch({ capacity: v })} min={1} /></Field>
      <Field label="Latency p50 (ms)"><NumInput value={cfg.latencyMs} onChange={v => patch({ latencyMs: v })} min={0} /></Field>
      <Field label="Failure rate"><RangeInput value={cfg.failureRate} onChange={v => patch({ failureRate: v })} /></Field>
      <Field label="Timeout (ms)"><NumInput value={cfg.timeoutMs} onChange={v => patch({ timeoutMs: v })} min={100} step={100} /></Field>
    </>
  )
}

// ── Per-type config sections ──────────────────────────────────────────────────

function ClientFields({ nodeId, cfg }: { nodeId: string; cfg: ClientConfig }) {
  const patch = (p: Partial<ClientConfig>) =>
    runInAction(() => graphStore.updateNodeConfig(nodeId, { config: { ...cfg, ...p } } as any))
  return (
    <>
      <Field label="Requests/sec"><NumInput value={cfg.rps} onChange={v => patch({ rps: v })} min={1} /></Field>
      <Field label="Burst mode">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={cfg.burst} onChange={e => patch({ burst: e.target.checked })} className="accent-indigo-500 w-4 h-4" />
          <span className="text-sm text-gray-700">Simulate burst traffic</span>
        </label>
      </Field>
    </>
  )
}

function LBFields({ nodeId, cfg }: { nodeId: string; cfg: LoadBalancerConfig }) {
  const patch = (p: Partial<LoadBalancerConfig>) =>
    runInAction(() => graphStore.updateNodeConfig(nodeId, { config: { ...cfg, ...p } } as any))
  return (
    <>
      <Field label="Strategy">
        <Select value={cfg.strategy} onChange={v => patch({ strategy: v })} options={[
          { value: LBStrategy.RoundRobin, label: 'Round Robin' },
          { value: LBStrategy.LeastConnections, label: 'Least Connections' },
          { value: LBStrategy.Random, label: 'Random' },
        ]} />
      </Field>
      <Field label="Replicas"><NumInput value={cfg.replicas} onChange={v => patch({ replicas: v })} min={1} max={32} /></Field>
      <Divider />
      <BaseFields nodeId={nodeId} cfg={cfg} />
    </>
  )
}

function CacheFields({ nodeId, cfg }: { nodeId: string; cfg: CacheConfig | CDNConfig }) {
  const patch = (p: Partial<CacheConfig>) =>
    runInAction(() => graphStore.updateNodeConfig(nodeId, { config: { ...cfg, ...p } } as any))
  return (
    <>
      <Field label="Hit rate"><RangeInput value={cfg.hitRate} onChange={v => patch({ hitRate: v })} /></Field>
      <Divider />
      <BaseFields nodeId={nodeId} cfg={cfg} />
    </>
  )
}

function QueueFields({ nodeId, cfg }: { nodeId: string; cfg: QueueConfig }) {
  const patch = (p: Partial<QueueConfig>) =>
    runInAction(() => graphStore.updateNodeConfig(nodeId, { config: { ...cfg, ...p } } as any))
  return (
    <>
      <Field label="Message delay (ms)"><NumInput value={cfg.delayMs} onChange={v => patch({ delayMs: v })} min={0} /></Field>
      <Field label="Max depth (0 = unlimited)"><NumInput value={cfg.maxDepth} onChange={v => patch({ maxDepth: v })} min={0} /></Field>
    </>
  )
}

function ApiGatewayFields({ nodeId, cfg }: { nodeId: string; cfg: ApiGatewayConfig }) {
  const patch = (p: Partial<ApiGatewayConfig>) =>
    runInAction(() => graphStore.updateNodeConfig(nodeId, { config: { ...cfg, ...p } } as any))
  return (
    <>
      <Field label="Rate limit per client (req/s)" hint="0 = unlimited"><NumInput value={cfg.rateLimit} onChange={v => patch({ rateLimit: v })} min={0} /></Field>
      <Field label="Auth overhead (ms)"><NumInput value={cfg.authOverheadMs} onChange={v => patch({ authOverheadMs: v })} min={0} /></Field>
      <Divider />
      <BaseFields nodeId={nodeId} cfg={cfg} />
    </>
  )
}

function ServerlessFields({ nodeId, cfg }: { nodeId: string; cfg: ServerlessConfig }) {
  const patch = (p: Partial<ServerlessConfig>) =>
    runInAction(() => graphStore.updateNodeConfig(nodeId, { config: { ...cfg, ...p } } as any))
  return (
    <>
      <Field label="Cold start latency (ms)"><NumInput value={cfg.coldStartMs} onChange={v => patch({ coldStartMs: v })} min={0} /></Field>
      <Field label="Warm latency (ms)"><NumInput value={cfg.warmLatencyMs} onChange={v => patch({ warmLatencyMs: v })} min={0} /></Field>
      <Field label="Cold start probability"><RangeInput value={cfg.coldStartProbability} onChange={v => patch({ coldStartProbability: v })} /></Field>
      <Field label="Concurrency limit"><NumInput value={cfg.concurrencyLimit} onChange={v => patch({ concurrencyLimit: v })} min={1} /></Field>
      <Field label="Failure rate"><RangeInput value={cfg.failureRate} onChange={v => patch({ failureRate: v })} /></Field>
      <Field label="Timeout (ms)"><NumInput value={cfg.timeoutMs} onChange={v => patch({ timeoutMs: v })} min={1000} step={1000} /></Field>
    </>
  )
}

function WorkerFields({ nodeId, cfg }: { nodeId: string; cfg: WorkerConfig }) {
  const patch = (p: Partial<WorkerConfig>) =>
    runInAction(() => graphStore.updateNodeConfig(nodeId, { config: { ...cfg, ...p } } as any))
  return (
    <>
      <Field label="Throughput (jobs/sec)"><NumInput value={cfg.throughput} onChange={v => patch({ throughput: v })} min={1} /></Field>
      <Field label="Processing time (ms)"><NumInput value={cfg.processingMs} onChange={v => patch({ processingMs: v })} min={0} /></Field>
      <Field label="Concurrency"><NumInput value={cfg.concurrency} onChange={v => patch({ concurrency: v })} min={1} /></Field>
      <Field label="Failure rate"><RangeInput value={cfg.failureRate} onChange={v => patch({ failureRate: v })} /></Field>
      <Field label="Max retries"><NumInput value={cfg.retries} onChange={v => patch({ retries: v })} min={0} max={10} /></Field>
    </>
  )
}

function PubSubFields({ nodeId, cfg }: { nodeId: string; cfg: PubSubConfig }) {
  const patch = (p: Partial<PubSubConfig>) =>
    runInAction(() => graphStore.updateNodeConfig(nodeId, { config: { ...cfg, ...p } } as any))
  return (
    <>
      <Field label="Subscribers"><NumInput value={cfg.subscriberCount} onChange={v => patch({ subscriberCount: v })} min={1} /></Field>
      <Field label="Delivery latency (ms)"><NumInput value={cfg.deliveryLatencyMs} onChange={v => patch({ deliveryLatencyMs: v })} min={0} /></Field>
      <Field label="Failure rate"><RangeInput value={cfg.failureRate} onChange={v => patch({ failureRate: v })} /></Field>
      <Field label="Max depth (0 = unlimited)"><NumInput value={cfg.maxDepth} onChange={v => patch({ maxDepth: v })} min={0} /></Field>
    </>
  )
}

function StreamFields({ nodeId, cfg }: { nodeId: string; cfg: StreamConfig }) {
  const patch = (p: Partial<StreamConfig>) =>
    runInAction(() => graphStore.updateNodeConfig(nodeId, { config: { ...cfg, ...p } } as any))
  return (
    <>
      <Field label="Partitions"><NumInput value={cfg.partitions} onChange={v => patch({ partitions: v })} min={1} /></Field>
      <Field label="Throughput (msg/sec)"><NumInput value={cfg.throughput} onChange={v => patch({ throughput: v })} min={1} /></Field>
      <Field label="Consumer groups"><NumInput value={cfg.consumerGroups} onChange={v => patch({ consumerGroups: v })} min={1} /></Field>
      <Field label="Retention (ms)" hint="Default 7 days"><NumInput value={cfg.retentionMs} onChange={v => patch({ retentionMs: v })} min={0} step={3600000} /></Field>
      <Field label="Failure rate"><RangeInput value={cfg.failureRate} onChange={v => patch({ failureRate: v })} /></Field>
    </>
  )
}

function RateLimiterFields({ nodeId, cfg }: { nodeId: string; cfg: RateLimiterConfig }) {
  const patch = (p: Partial<RateLimiterConfig>) =>
    runInAction(() => graphStore.updateNodeConfig(nodeId, { config: { ...cfg, ...p } } as any))
  return (
    <>
      <Field label="Rate limit (req/s)"><NumInput value={cfg.rateLimit} onChange={v => patch({ rateLimit: v })} min={1} /></Field>
      <Field label="Burst size"><NumInput value={cfg.burstSize} onChange={v => patch({ burstSize: v })} min={0} /></Field>
      <Field label="Algorithm">
        <Select value={cfg.algorithm} onChange={v => patch({ algorithm: v })} options={[
          { value: RateLimitAlgorithm.TokenBucket, label: 'Token Bucket' },
          { value: RateLimitAlgorithm.SlidingWindow, label: 'Sliding Window' },
          { value: RateLimitAlgorithm.FixedWindow, label: 'Fixed Window' },
        ]} />
      </Field>
      <Field label="Reject behavior">
        <Select value={cfg.rejectBehavior} onChange={v => patch({ rejectBehavior: v })} options={[
          { value: RejectBehavior.Drop, label: 'Drop (instant 429)' },
          { value: RejectBehavior.Queue, label: 'Queue (hold until slot)' },
        ]} />
      </Field>
    </>
  )
}

function ObjectStoreFields({ nodeId, cfg }: { nodeId: string; cfg: ObjectStoreConfig }) {
  const patch = (p: Partial<ObjectStoreConfig>) =>
    runInAction(() => graphStore.updateNodeConfig(nodeId, { config: { ...cfg, ...p } } as any))
  return (
    <>
      <Field label="Read throughput (MB/s)"><NumInput value={cfg.readThroughputMbps} onChange={v => patch({ readThroughputMbps: v })} min={1} /></Field>
      <Field label="Write throughput (MB/s)"><NumInput value={cfg.writeThroughputMbps} onChange={v => patch({ writeThroughputMbps: v })} min={1} /></Field>
      <Field label="Latency to first byte (ms)"><NumInput value={cfg.latencyMs} onChange={v => patch({ latencyMs: v })} min={0} /></Field>
      <Field label="Failure rate"><RangeInput value={cfg.failureRate} onChange={v => patch({ failureRate: v })} /></Field>
      <Field label="Max object size (MB)" hint="0 = unlimited"><NumInput value={cfg.maxObjectSizeMb} onChange={v => patch({ maxObjectSizeMb: v })} min={0} /></Field>
    </>
  )
}

function ExternalServiceFields({ nodeId, cfg }: { nodeId: string; cfg: ExternalServiceConfig }) {
  const patch = (p: Partial<ExternalServiceConfig>) =>
    runInAction(() => graphStore.updateNodeConfig(nodeId, { config: { ...cfg, ...p } } as any))
  return (
    <>
      <Field label="Latency p50 (ms)"><NumInput value={cfg.latencyMs} onChange={v => patch({ latencyMs: v })} min={0} /></Field>
      <Field label="Latency p99 (ms)" hint="Spread between p50/p99 causes tail latency"><NumInput value={cfg.p99LatencyMs} onChange={v => patch({ p99LatencyMs: v })} min={0} /></Field>
      <Field label="Failure rate"><RangeInput value={cfg.failureRate} onChange={v => patch({ failureRate: v })} /></Field>
      <Field label="Timeout (ms)"><NumInput value={cfg.timeoutMs} onChange={v => patch({ timeoutMs: v })} min={100} step={100} /></Field>
      <Field label="Provider rate limit (req/s)" hint="0 = unlimited"><NumInput value={cfg.rateLimit} onChange={v => patch({ rateLimit: v })} min={0} /></Field>
    </>
  )
}

function LLMGatewayFields({ nodeId, cfg }: { nodeId: string; cfg: LLMGatewayConfig }) {
  const patch = (p: Partial<LLMGatewayConfig>) =>
    runInAction(() => graphStore.updateNodeConfig(nodeId, { config: { ...cfg, ...p } } as any))
  return (
    <>
      <Field label="Tokens/sec (model speed)"><NumInput value={cfg.tokensPerSecond} onChange={v => patch({ tokensPerSecond: v })} min={1} /></Field>
      <Field label="Avg prompt tokens"><NumInput value={cfg.avgPromptTokens} onChange={v => patch({ avgPromptTokens: v })} min={1} /></Field>
      <Field label="Avg completion tokens"><NumInput value={cfg.avgCompletionTokens} onChange={v => patch({ avgCompletionTokens: v })} min={1} /></Field>
      <Field label="Rate limit (tokens/min)"><NumInput value={cfg.rateLimitTpm} onChange={v => patch({ rateLimitTpm: v })} min={1000} step={1000} /></Field>
      <Field label="Failure rate"><RangeInput value={cfg.failureRate} onChange={v => patch({ failureRate: v })} /></Field>
      <Field label="Timeout (ms)"><NumInput value={cfg.timeoutMs} onChange={v => patch({ timeoutMs: v })} min={1000} step={5000} /></Field>
    </>
  )
}

function VectorDBFields({ nodeId, cfg }: { nodeId: string; cfg: VectorDBConfig }) {
  const patch = (p: Partial<VectorDBConfig>) =>
    runInAction(() => graphStore.updateNodeConfig(nodeId, { config: { ...cfg, ...p } } as any))
  return (
    <>
      <Field label="Query capacity (q/s)"><NumInput value={cfg.queryCapacity} onChange={v => patch({ queryCapacity: v })} min={1} /></Field>
      <Field label="Index size (M vectors)"><NumInput value={cfg.indexSizeM} onChange={v => patch({ indexSizeM: v })} min={0.1} step={0.1} /></Field>
      <Field label="Dimensions"><NumInput value={cfg.dimensions} onChange={v => patch({ dimensions: v })} min={64} step={64} /></Field>
      <Field label="Query latency p50 (ms)"><NumInput value={cfg.queryLatencyMs} onChange={v => patch({ queryLatencyMs: v })} min={1} /></Field>
      <Field label="Failure rate"><RangeInput value={cfg.failureRate} onChange={v => patch({ failureRate: v })} /></Field>
    </>
  )
}

function AgentOrchestratorFields({ nodeId, cfg }: { nodeId: string; cfg: AgentOrchestratorConfig }) {
  const patch = (p: Partial<AgentOrchestratorConfig>) =>
    runInAction(() => graphStore.updateNodeConfig(nodeId, { config: { ...cfg, ...p } } as any))
  return (
    <>
      <Field label="Max concurrent agents"><NumInput value={cfg.maxConcurrentAgents} onChange={v => patch({ maxConcurrentAgents: v })} min={1} /></Field>
      <Field label="Step latency (ms)"><NumInput value={cfg.stepLatencyMs} onChange={v => patch({ stepLatencyMs: v })} min={0} /></Field>
      <Field label="Max steps per run"><NumInput value={cfg.maxSteps} onChange={v => patch({ maxSteps: v })} min={1} /></Field>
      <Field label="Failure rate per step"><RangeInput value={cfg.failureRate} onChange={v => patch({ failureRate: v })} /></Field>
      <Field label="Total run timeout (ms)"><NumInput value={cfg.timeoutMs} onChange={v => patch({ timeoutMs: v })} min={1000} step={10000} /></Field>
    </>
  )
}

// ── Structural node config (label + notes only) ───────────────────────────────

function StructuralFields({ nodeId }: { nodeId: string }) {
  const sn = graphStore.structuralNodes.get(nodeId)
  if (!sn) return null
  return (
    <>
      <Field label="Notes">
        <textarea
          value={sn.notes ?? ''}
          onChange={e => runInAction(() => graphStore.updateStructuralNode(nodeId, { notes: e.target.value }))}
          rows={3}
          className="text-sm border border-gray-200 rounded-md px-2 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-indigo-300 resize-none"
          placeholder="Optional annotation…"
        />
      </Field>
    </>
  )
}

// ── Main ConfigPanel ──────────────────────────────────────────────────────────

const ConfigPanel = observer(() => {
  const nodeId = graphStore.selectedNodeId
  const simNode        = nodeId ? graphStore.nodes.get(nodeId) : null
  const structuralNode = nodeId ? graphStore.structuralNodes.get(nodeId) : null

  if (!nodeId || (!simNode && !structuralNode)) {
    return (
      <aside className="w-80 bg-white border-l border-gray-200 flex flex-col items-center justify-center text-center p-6 shrink-0">
        <span className="text-3xl mb-3">🖱️</span>
        <p className="text-sm text-gray-500">Click a node to configure it</p>
      </aside>
    )
  }

  // ── Structural node panel ──────────────────────────────────────────────────
  if (structuralNode) {
    const display = STRUCTURAL_DISPLAY[structuralNode.structuralType]
    return (
      <aside className="w-80 bg-white border-l border-gray-200 flex flex-col shrink-0 overflow-hidden">
        <div className={`px-4 py-3 border-b border-gray-200 flex items-center gap-2 ${display.colorClass}`}>
          <span className="text-lg">{display.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{display.label}</p>
            <p className="text-xs text-gray-400">Structural — engine ignores this</p>
          </div>
          <button onClick={() => runInAction(() => graphStore.removeStructuralNode(nodeId))}
            className="text-red-400 hover:text-red-600 p-1 rounded transition-colors" title="Delete">🗑️</button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
          <Field label="Label">
            <input type="text" value={structuralNode.label}
              onChange={e => runInAction(() => graphStore.updateStructuralNode(nodeId, { label: e.target.value }))}
              className="text-sm border border-gray-200 rounded-md px-2 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-indigo-300" />
          </Field>
          <Divider />
          <StructuralFields nodeId={nodeId} />
        </div>
      </aside>
    )
  }

  // ── Simulation node panel ──────────────────────────────────────────────────
  const node = simNode!
  const display = NODE_DISPLAY[node.nodeType]

  function renderConfigFields() {
    switch (node.nodeType) {
      case NodeType.Client:           return <ClientFields nodeId={nodeId!} cfg={node.config as ClientConfig} />
      case NodeType.LoadBalancer:     return <LBFields nodeId={nodeId!} cfg={node.config as LoadBalancerConfig} />
      case NodeType.Cache:            return <CacheFields nodeId={nodeId!} cfg={node.config as CacheConfig} />
      case NodeType.CDN:              return <CacheFields nodeId={nodeId!} cfg={node.config as CDNConfig} />
      case NodeType.Queue:            return <QueueFields nodeId={nodeId!} cfg={node.config as QueueConfig} />
      case NodeType.ApiGateway:       return <ApiGatewayFields nodeId={nodeId!} cfg={node.config as ApiGatewayConfig} />
      case NodeType.Serverless:       return <ServerlessFields nodeId={nodeId!} cfg={node.config as ServerlessConfig} />
      case NodeType.Worker:           return <WorkerFields nodeId={nodeId!} cfg={node.config as WorkerConfig} />
      case NodeType.PubSub:           return <PubSubFields nodeId={nodeId!} cfg={node.config as PubSubConfig} />
      case NodeType.Stream:           return <StreamFields nodeId={nodeId!} cfg={node.config as StreamConfig} />
      case NodeType.RateLimiter:      return <RateLimiterFields nodeId={nodeId!} cfg={node.config as RateLimiterConfig} />
      case NodeType.ObjectStore:      return <ObjectStoreFields nodeId={nodeId!} cfg={node.config as ObjectStoreConfig} />
      case NodeType.ExternalService:  return <ExternalServiceFields nodeId={nodeId!} cfg={node.config as ExternalServiceConfig} />
      case NodeType.LLMGateway:       return <LLMGatewayFields nodeId={nodeId!} cfg={node.config as LLMGatewayConfig} />
      case NodeType.VectorDB:         return <VectorDBFields nodeId={nodeId!} cfg={node.config as VectorDBConfig} />
      case NodeType.AgentOrchestrator: return <AgentOrchestratorFields nodeId={nodeId!} cfg={node.config as AgentOrchestratorConfig} />
      default:                        return <BaseFields nodeId={nodeId!} cfg={node.config as BaseNodeConfig} />
    }
  }

  return (
    <aside className="w-80 bg-white border-l border-gray-200 flex flex-col shrink-0 overflow-hidden">
      <div className={`px-4 py-3 border-b border-gray-200 flex items-center gap-2 ${display.colorClass}`}>
        <span className="text-lg">{display.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{display.label}</p>
          <p className="text-xs text-gray-500 truncate">{node.id}</p>
        </div>
        <button onClick={() => runInAction(() => graphStore.removeNode(nodeId!))}
          className="text-red-400 hover:text-red-600 p-1 rounded transition-colors" title="Delete node">🗑️</button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        <Field label="Label">
          <input type="text" value={node.label} maxLength={40}
            onChange={e => runInAction(() => graphStore.updateNodeConfig(nodeId!, { label: e.target.value } as any))}
            className="text-sm border border-gray-200 rounded-md px-2 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-indigo-300" />
        </Field>
        <Divider />
        {renderConfigFields()}
      </div>
    </aside>
  )
})

export default ConfigPanel
