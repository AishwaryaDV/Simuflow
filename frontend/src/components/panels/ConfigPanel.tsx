import { observer } from 'mobx-react-lite'
import { runInAction } from 'mobx'
import { useState, useEffect } from 'react'
import { Trash2, DollarSign } from 'lucide-react'
import { graphStore } from '../../stores/GraphStore'
import {
  NodeType, LBStrategy, RateLimitAlgorithm, RejectBehavior,
} from '../../types/topology'
import type {
  BaseNodeConfig, ClientConfig, LoadBalancerConfig, CacheConfig, CDNConfig, QueueConfig,
  ApiGatewayConfig, ServerlessConfig, WorkerConfig, PubSubConfig, StreamConfig,
  RateLimiterConfig, ObjectStoreConfig, ExternalServiceConfig, LLMGatewayConfig,
  VectorDBConfig, AgentOrchestratorConfig, DNSConfig, NoSQLStoreConfig, WAFConfig, GraphDBConfig,
  ObservabilityMeshConfig, ToolRegistryConfig, MemoryFabricConfig,
} from '../../types/topology'
import { NODE_DISPLAY, STRUCTURAL_DISPLAY } from '../canvas/nodeConfig'
import { costStore } from '../../stores/CostStore'

// ── Shared field primitives ───────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium text-app-text-2 tracking-wide">{label}</span>
      {children}
      {hint && <span className="text-[10px] text-app-text-3 leading-relaxed">{hint}</span>}
    </label>
  )
}

function FieldGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 bg-app-elevated/40 rounded-xl px-3 py-3 border border-app-border/60">
      {children}
    </div>
  )
}

const inputCls = 'text-sm border border-app-border bg-app-elevated text-app-text rounded-lg px-2.5 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-app-accent transition-colors'

function NumInput({ value, onChange, min, max, step }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number
}) {
  const [local, setLocal] = useState(String(value))

  // Sync if external value changes (e.g. preset load)
  useEffect(() => { setLocal(String(value)) }, [value])

  return (
    <input
      type="number"
      value={local}
      min={min} max={max} step={step ?? 1}
      onChange={e => setLocal(e.target.value)}
      onBlur={() => {
        const n = Number(local)
        if (!isNaN(n) && local.trim() !== '') {
          const clamped = min !== undefined ? Math.max(min, n) : n
          onChange(clamped)
          setLocal(String(clamped))
        } else {
          setLocal(String(value)) // revert if invalid
        }
      }}
      className={inputCls}
    />
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
        className="flex-1 accent-app-accent" />
      <span className="text-xs text-app-text-2 w-14 text-right">{display}</span>
    </div>
  )
}

function Select<T extends string>({ value, onChange, options }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: string }[]
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value as T)}
      className={inputCls + ' cursor-pointer'}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold uppercase tracking-widest text-app-text-3 mt-1">{children}</p>
}

// ── Reusable base config block ────────────────────────────────────────────────

function BaseFields({ nodeId, cfg }: { nodeId: string; cfg: BaseNodeConfig }) {
  const patch = (p: Partial<BaseNodeConfig>) =>
    runInAction(() => graphStore.updateNodeConfig(nodeId, { config: { ...cfg, ...p } } as any))
  return (
    <FieldGroup>
      <Field label="Capacity (req/s)"><NumInput value={cfg.capacity} onChange={v => patch({ capacity: v })} min={1} /></Field>
      <Field label="Latency p50 (ms)"><NumInput value={cfg.latencyMs} onChange={v => patch({ latencyMs: v })} min={0} /></Field>
      <Field label="Failure rate"><RangeInput value={cfg.failureRate} onChange={v => patch({ failureRate: v })} /></Field>
      <Field label="Timeout (ms)"><NumInput value={cfg.timeoutMs} onChange={v => patch({ timeoutMs: v })} min={100} step={100} /></Field>
    </FieldGroup>
  )
}

// ── Per-type config sections ──────────────────────────────────────────────────

function ClientFields({ nodeId, cfg }: { nodeId: string; cfg: ClientConfig }) {
  const patch = (p: Partial<ClientConfig>) =>
    runInAction(() => graphStore.updateNodeConfig(nodeId, { config: { ...cfg, ...p } } as any))
  return (
    <FieldGroup>
      <Field label="Requests / sec"><NumInput value={cfg.rps} onChange={v => patch({ rps: v })} min={1} /></Field>
      <Field label="Burst mode">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={cfg.burst} onChange={e => patch({ burst: e.target.checked })} className="accent-app-accent w-4 h-4" />
          <span className="text-sm text-app-text-2">Simulate burst traffic</span>
        </label>
      </Field>
    </FieldGroup>
  )
}

function LBFields({ nodeId, cfg }: { nodeId: string; cfg: LoadBalancerConfig }) {
  const patch = (p: Partial<LoadBalancerConfig>) =>
    runInAction(() => graphStore.updateNodeConfig(nodeId, { config: { ...cfg, ...p } } as any))
  return (
    <>
      <FieldGroup>
        <Field label="Strategy">
          <Select value={cfg.strategy} onChange={v => patch({ strategy: v })} options={[
            { value: LBStrategy.RoundRobin, label: 'Round Robin' },
            { value: LBStrategy.LeastConnections, label: 'Least Connections' },
            { value: LBStrategy.Random, label: 'Random' },
          ]} />
        </Field>
        <Field label="Replicas"><NumInput value={cfg.replicas} onChange={v => patch({ replicas: v })} min={1} max={32} /></Field>
      </FieldGroup>
      <SectionLabel>Base Parameters</SectionLabel>
      <BaseFields nodeId={nodeId} cfg={cfg} />
    </>
  )
}

function CacheFields({ nodeId, cfg }: { nodeId: string; cfg: CacheConfig | CDNConfig }) {
  const patch = (p: Partial<CacheConfig>) =>
    runInAction(() => graphStore.updateNodeConfig(nodeId, { config: { ...cfg, ...p } } as any))
  return (
    <>
      <FieldGroup>
        <Field label="Hit rate"><RangeInput value={cfg.hitRate} onChange={v => patch({ hitRate: v })} /></Field>
      </FieldGroup>
      <SectionLabel>Base Parameters</SectionLabel>
      <BaseFields nodeId={nodeId} cfg={cfg} />
    </>
  )
}

function QueueFields({ nodeId, cfg }: { nodeId: string; cfg: QueueConfig }) {
  const patch = (p: Partial<QueueConfig>) =>
    runInAction(() => graphStore.updateNodeConfig(nodeId, { config: { ...cfg, ...p } } as any))
  return (
    <FieldGroup>
      <Field label="Message delay (ms)"><NumInput value={cfg.delayMs} onChange={v => patch({ delayMs: v })} min={0} /></Field>
      <Field label="Max depth (0 = unlimited)"><NumInput value={cfg.maxDepth} onChange={v => patch({ maxDepth: v })} min={0} /></Field>
    </FieldGroup>
  )
}

function ApiGatewayFields({ nodeId, cfg }: { nodeId: string; cfg: ApiGatewayConfig }) {
  const patch = (p: Partial<ApiGatewayConfig>) =>
    runInAction(() => graphStore.updateNodeConfig(nodeId, { config: { ...cfg, ...p } } as any))
  return (
    <>
      <FieldGroup>
        <Field label="Rate limit / client (req/s)" hint="0 = unlimited"><NumInput value={cfg.rateLimit} onChange={v => patch({ rateLimit: v })} min={0} /></Field>
        <Field label="Auth overhead (ms)"><NumInput value={cfg.authOverheadMs} onChange={v => patch({ authOverheadMs: v })} min={0} /></Field>
      </FieldGroup>
      <SectionLabel>Base Parameters</SectionLabel>
      <BaseFields nodeId={nodeId} cfg={cfg} />
    </>
  )
}

function ServerlessFields({ nodeId, cfg }: { nodeId: string; cfg: ServerlessConfig }) {
  const patch = (p: Partial<ServerlessConfig>) =>
    runInAction(() => graphStore.updateNodeConfig(nodeId, { config: { ...cfg, ...p } } as any))
  return (
    <>
      <FieldGroup>
        <Field label="Cold start latency (ms)"><NumInput value={cfg.coldStartMs} onChange={v => patch({ coldStartMs: v })} min={0} /></Field>
        <Field label="Warm latency (ms)"><NumInput value={cfg.warmLatencyMs} onChange={v => patch({ warmLatencyMs: v })} min={0} /></Field>
        <Field label="Cold start probability"><RangeInput value={cfg.coldStartProbability} onChange={v => patch({ coldStartProbability: v })} /></Field>
        <Field label="Concurrency limit"><NumInput value={cfg.concurrencyLimit} onChange={v => patch({ concurrencyLimit: v })} min={1} /></Field>
      </FieldGroup>
      <FieldGroup>
        <Field label="Failure rate"><RangeInput value={cfg.failureRate} onChange={v => patch({ failureRate: v })} /></Field>
        <Field label="Timeout (ms)"><NumInput value={cfg.timeoutMs} onChange={v => patch({ timeoutMs: v })} min={1000} step={1000} /></Field>
      </FieldGroup>
    </>
  )
}

function WorkerFields({ nodeId, cfg }: { nodeId: string; cfg: WorkerConfig }) {
  const patch = (p: Partial<WorkerConfig>) =>
    runInAction(() => graphStore.updateNodeConfig(nodeId, { config: { ...cfg, ...p } } as any))
  return (
    <>
      <FieldGroup>
        <Field label="Throughput (jobs/sec)"><NumInput value={cfg.throughput} onChange={v => patch({ throughput: v })} min={1} /></Field>
        <Field label="Processing time (ms)"><NumInput value={cfg.processingMs} onChange={v => patch({ processingMs: v })} min={0} /></Field>
        <Field label="Concurrency"><NumInput value={cfg.concurrency} onChange={v => patch({ concurrency: v })} min={1} /></Field>
      </FieldGroup>
      <FieldGroup>
        <Field label="Failure rate"><RangeInput value={cfg.failureRate} onChange={v => patch({ failureRate: v })} /></Field>
        <Field label="Max retries"><NumInput value={cfg.retries} onChange={v => patch({ retries: v })} min={0} max={10} /></Field>
      </FieldGroup>
    </>
  )
}

function PubSubFields({ nodeId, cfg }: { nodeId: string; cfg: PubSubConfig }) {
  const patch = (p: Partial<PubSubConfig>) =>
    runInAction(() => graphStore.updateNodeConfig(nodeId, { config: { ...cfg, ...p } } as any))
  return (
    <FieldGroup>
      <Field label="Subscribers"><NumInput value={cfg.subscriberCount} onChange={v => patch({ subscriberCount: v })} min={1} /></Field>
      <Field label="Delivery latency (ms)"><NumInput value={cfg.deliveryLatencyMs} onChange={v => patch({ deliveryLatencyMs: v })} min={0} /></Field>
      <Field label="Failure rate"><RangeInput value={cfg.failureRate} onChange={v => patch({ failureRate: v })} /></Field>
      <Field label="Max depth (0 = unlimited)"><NumInput value={cfg.maxDepth} onChange={v => patch({ maxDepth: v })} min={0} /></Field>
    </FieldGroup>
  )
}

function StreamFields({ nodeId, cfg }: { nodeId: string; cfg: StreamConfig }) {
  const patch = (p: Partial<StreamConfig>) =>
    runInAction(() => graphStore.updateNodeConfig(nodeId, { config: { ...cfg, ...p } } as any))
  return (
    <>
      <FieldGroup>
        <Field label="Partitions"><NumInput value={cfg.partitions} onChange={v => patch({ partitions: v })} min={1} /></Field>
        <Field label="Throughput (msg/sec)"><NumInput value={cfg.throughput} onChange={v => patch({ throughput: v })} min={1} /></Field>
        <Field label="Consumer groups"><NumInput value={cfg.consumerGroups} onChange={v => patch({ consumerGroups: v })} min={1} /></Field>
        <Field label="Retention (ms)" hint="Default 7 days"><NumInput value={cfg.retentionMs} onChange={v => patch({ retentionMs: v })} min={0} step={3600000} /></Field>
      </FieldGroup>
      <FieldGroup>
        <Field label="Failure rate"><RangeInput value={cfg.failureRate} onChange={v => patch({ failureRate: v })} /></Field>
      </FieldGroup>
    </>
  )
}

function RateLimiterFields({ nodeId, cfg }: { nodeId: string; cfg: RateLimiterConfig }) {
  const patch = (p: Partial<RateLimiterConfig>) =>
    runInAction(() => graphStore.updateNodeConfig(nodeId, { config: { ...cfg, ...p } } as any))
  return (
    <>
      <FieldGroup>
        <Field label="Rate limit (req/s)"><NumInput value={cfg.rateLimit} onChange={v => patch({ rateLimit: v })} min={1} /></Field>
        <Field label="Burst size"><NumInput value={cfg.burstSize} onChange={v => patch({ burstSize: v })} min={0} /></Field>
      </FieldGroup>
      <FieldGroup>
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
      </FieldGroup>
    </>
  )
}

function ObjectStoreFields({ nodeId, cfg }: { nodeId: string; cfg: ObjectStoreConfig }) {
  const patch = (p: Partial<ObjectStoreConfig>) =>
    runInAction(() => graphStore.updateNodeConfig(nodeId, { config: { ...cfg, ...p } } as any))
  return (
    <>
      <FieldGroup>
        <Field label="Read throughput (MB/s)"><NumInput value={cfg.readThroughputMbps} onChange={v => patch({ readThroughputMbps: v })} min={1} /></Field>
        <Field label="Write throughput (MB/s)"><NumInput value={cfg.writeThroughputMbps} onChange={v => patch({ writeThroughputMbps: v })} min={1} /></Field>
        <Field label="Latency to first byte (ms)"><NumInput value={cfg.latencyMs} onChange={v => patch({ latencyMs: v })} min={0} /></Field>
      </FieldGroup>
      <FieldGroup>
        <Field label="Failure rate"><RangeInput value={cfg.failureRate} onChange={v => patch({ failureRate: v })} /></Field>
        <Field label="Max object size (MB)" hint="0 = unlimited"><NumInput value={cfg.maxObjectSizeMb} onChange={v => patch({ maxObjectSizeMb: v })} min={0} /></Field>
      </FieldGroup>
    </>
  )
}

function ExternalServiceFields({ nodeId, cfg }: { nodeId: string; cfg: ExternalServiceConfig }) {
  const patch = (p: Partial<ExternalServiceConfig>) =>
    runInAction(() => graphStore.updateNodeConfig(nodeId, { config: { ...cfg, ...p } } as any))
  return (
    <>
      <FieldGroup>
        <Field label="Latency p50 (ms)"><NumInput value={cfg.latencyMs} onChange={v => patch({ latencyMs: v })} min={0} /></Field>
        <Field label="Latency p99 (ms)" hint="Spread between p50/p99 causes tail latency"><NumInput value={cfg.p99LatencyMs} onChange={v => patch({ p99LatencyMs: v })} min={0} /></Field>
        <Field label="Provider rate limit (req/s)" hint="0 = unlimited"><NumInput value={cfg.rateLimit} onChange={v => patch({ rateLimit: v })} min={0} /></Field>
      </FieldGroup>
      <FieldGroup>
        <Field label="Failure rate"><RangeInput value={cfg.failureRate} onChange={v => patch({ failureRate: v })} /></Field>
        <Field label="Timeout (ms)"><NumInput value={cfg.timeoutMs} onChange={v => patch({ timeoutMs: v })} min={100} step={100} /></Field>
      </FieldGroup>
    </>
  )
}

function LLMGatewayFields({ nodeId, cfg }: { nodeId: string; cfg: LLMGatewayConfig }) {
  const patch = (p: Partial<LLMGatewayConfig>) =>
    runInAction(() => graphStore.updateNodeConfig(nodeId, { config: { ...cfg, ...p } } as any))
  return (
    <>
      <FieldGroup>
        <Field label="Tokens / sec (model speed)"><NumInput value={cfg.tokensPerSecond} onChange={v => patch({ tokensPerSecond: v })} min={1} /></Field>
        <Field label="Avg prompt tokens"><NumInput value={cfg.avgPromptTokens} onChange={v => patch({ avgPromptTokens: v })} min={1} /></Field>
        <Field label="Avg completion tokens"><NumInput value={cfg.avgCompletionTokens} onChange={v => patch({ avgCompletionTokens: v })} min={1} /></Field>
        <Field label="Rate limit (tokens/min)"><NumInput value={cfg.rateLimitTpm} onChange={v => patch({ rateLimitTpm: v })} min={1000} step={1000} /></Field>
      </FieldGroup>
      <FieldGroup>
        <Field label="Failure rate"><RangeInput value={cfg.failureRate} onChange={v => patch({ failureRate: v })} /></Field>
        <Field label="Timeout (ms)"><NumInput value={cfg.timeoutMs} onChange={v => patch({ timeoutMs: v })} min={1000} step={5000} /></Field>
      </FieldGroup>
    </>
  )
}

function VectorDBFields({ nodeId, cfg }: { nodeId: string; cfg: VectorDBConfig }) {
  const patch = (p: Partial<VectorDBConfig>) =>
    runInAction(() => graphStore.updateNodeConfig(nodeId, { config: { ...cfg, ...p } } as any))
  return (
    <>
      <FieldGroup>
        <Field label="Query capacity (q/s)"><NumInput value={cfg.queryCapacity} onChange={v => patch({ queryCapacity: v })} min={1} /></Field>
        <Field label="Index size (M vectors)"><NumInput value={cfg.indexSizeM} onChange={v => patch({ indexSizeM: v })} min={0.1} step={0.1} /></Field>
        <Field label="Dimensions"><NumInput value={cfg.dimensions} onChange={v => patch({ dimensions: v })} min={64} step={64} /></Field>
        <Field label="Query latency p50 (ms)"><NumInput value={cfg.queryLatencyMs} onChange={v => patch({ queryLatencyMs: v })} min={1} /></Field>
      </FieldGroup>
      <FieldGroup>
        <Field label="Failure rate"><RangeInput value={cfg.failureRate} onChange={v => patch({ failureRate: v })} /></Field>
      </FieldGroup>
    </>
  )
}

function AgentOrchestratorFields({ nodeId, cfg }: { nodeId: string; cfg: AgentOrchestratorConfig }) {
  const patch = (p: Partial<AgentOrchestratorConfig>) =>
    runInAction(() => graphStore.updateNodeConfig(nodeId, { config: { ...cfg, ...p } } as any))
  return (
    <>
      <FieldGroup>
        <Field label="Max concurrent agents"><NumInput value={cfg.maxConcurrentAgents} onChange={v => patch({ maxConcurrentAgents: v })} min={1} /></Field>
        <Field label="Step latency (ms)"><NumInput value={cfg.stepLatencyMs} onChange={v => patch({ stepLatencyMs: v })} min={0} /></Field>
        <Field label="Max steps per run"><NumInput value={cfg.maxSteps} onChange={v => patch({ maxSteps: v })} min={1} /></Field>
      </FieldGroup>
      <FieldGroup>
        <Field label="Failure rate / step"><RangeInput value={cfg.failureRate} onChange={v => patch({ failureRate: v })} /></Field>
        <Field label="Total run timeout (ms)"><NumInput value={cfg.timeoutMs} onChange={v => patch({ timeoutMs: v })} min={1000} step={10000} /></Field>
      </FieldGroup>
    </>
  )
}

function DNSFields({ nodeId, cfg }: { nodeId: string; cfg: DNSConfig }) {
  const patch = (p: Partial<DNSConfig>) =>
    runInAction(() => graphStore.updateNodeConfig(nodeId, { config: { ...cfg, ...p } } as any))
  return (
    <>
      <FieldGroup>
        <Field label="TTL (seconds)" hint="Higher TTL = more client caching = less resolver load">
          <NumInput value={cfg.ttlSeconds} onChange={v => patch({ ttlSeconds: v })} min={1} step={60} />
        </Field>
        <Field label="Regions (PoPs)" hint="More PoPs = lower average resolution latency">
          <NumInput value={cfg.regions} onChange={v => patch({ regions: v })} min={1} max={32} />
        </Field>
        <Field label="Resolution latency (ms)"><NumInput value={cfg.latencyMs} onChange={v => patch({ latencyMs: v })} min={1} /></Field>
      </FieldGroup>
      <FieldGroup>
        <Field label="Failure rate"><RangeInput value={cfg.failureRate} onChange={v => patch({ failureRate: v })} /></Field>
      </FieldGroup>
    </>
  )
}

function NoSQLStoreFields({ nodeId, cfg }: { nodeId: string; cfg: NoSQLStoreConfig }) {
  const patch = (p: Partial<NoSQLStoreConfig>) =>
    runInAction(() => graphStore.updateNodeConfig(nodeId, { config: { ...cfg, ...p } } as any))
  return (
    <>
      <FieldGroup>
        <Field label="Read capacity (ops/s)"><NumInput value={cfg.readCapacity} onChange={v => patch({ readCapacity: v })} min={1} /></Field>
        <Field label="Write capacity (ops/s)"><NumInput value={cfg.writeCapacity} onChange={v => patch({ writeCapacity: v })} min={1} /></Field>
        <Field label="Replication factor" hint="Each write is replicated to N nodes — multiplies write load">
          <NumInput value={cfg.replicationFactor} onChange={v => patch({ replicationFactor: v })} min={1} max={7} />
        </Field>
        <Field label="Read latency (ms)"><NumInput value={cfg.latencyMs} onChange={v => patch({ latencyMs: v })} min={1} /></Field>
      </FieldGroup>
      <FieldGroup>
        <Field label="Failure rate"><RangeInput value={cfg.failureRate} onChange={v => patch({ failureRate: v })} /></Field>
      </FieldGroup>
    </>
  )
}

function WAFFields({ nodeId, cfg }: { nodeId: string; cfg: WAFConfig }) {
  const patch = (p: Partial<WAFConfig>) =>
    runInAction(() => graphStore.updateNodeConfig(nodeId, { config: { ...cfg, ...p } } as any))
  return (
    <>
      <FieldGroup>
        <Field label="Inspection capacity (req/s)" hint="Max RPS the WAF can inspect before becoming a bottleneck">
          <NumInput value={cfg.inspectionCapacity} onChange={v => patch({ inspectionCapacity: v })} min={1} />
        </Field>
        <Field label="Block rate" hint="Fraction of traffic blocked as malicious">
          <RangeInput value={cfg.blockRate} onChange={v => patch({ blockRate: v })} />
        </Field>
        <Field label="Inspection latency (ms)"><NumInput value={cfg.latencyMs} onChange={v => patch({ latencyMs: v })} min={0} /></Field>
      </FieldGroup>
      <FieldGroup>
        <Field label="Failure rate" hint="Fail-open: WAF failure passes all traffic through">
          <RangeInput value={cfg.failureRate} onChange={v => patch({ failureRate: v })} />
        </Field>
      </FieldGroup>
    </>
  )
}

function GraphDBFields({ nodeId, cfg }: { nodeId: string; cfg: GraphDBConfig }) {
  const patch = (p: Partial<GraphDBConfig>) =>
    runInAction(() => graphStore.updateNodeConfig(nodeId, { config: { ...cfg, ...p } } as any))
  return (
    <>
      <FieldGroup>
        <Field label="Query capacity (traversals/s)"><NumInput value={cfg.queryCapacity} onChange={v => patch({ queryCapacity: v })} min={1} /></Field>
        <Field label="Write capacity (mutations/s)"><NumInput value={cfg.writeCapacity} onChange={v => patch({ writeCapacity: v })} min={1} /></Field>
        <Field label="Query latency (ms)"><NumInput value={cfg.latencyMs} onChange={v => patch({ latencyMs: v })} min={1} /></Field>
      </FieldGroup>
      <FieldGroup>
        <Field label="Failure rate"><RangeInput value={cfg.failureRate} onChange={v => patch({ failureRate: v })} /></Field>
      </FieldGroup>
    </>
  )
}

function ObservabilityMeshFields({ nodeId, cfg }: { nodeId: string; cfg: ObservabilityMeshConfig }) {
  const patch = (p: Partial<ObservabilityMeshConfig>) =>
    runInAction(() => graphStore.updateNodeConfig(nodeId, { config: { ...cfg, ...p } } as any))
  return (
    <>
      <FieldGroup>
        <Field label="Inspection capacity (req/s)" hint="Exceeding this causes sampling degradation — utilisation climbs but traffic still passes">
          <NumInput value={cfg.inspectionRps} onChange={v => patch({ inspectionRps: v })} min={1} />
        </Field>
        <Field label="Sampling rate" hint="Fraction of requests recorded as full traces">
          <RangeInput value={cfg.samplingRate} onChange={v => patch({ samplingRate: v })} />
        </Field>
        <Field label="Per-request overhead (ms)"><NumInput value={cfg.latencyMs} onChange={v => patch({ latencyMs: v })} min={0} /></Field>
      </FieldGroup>
      <FieldGroup>
        <Field label="Failure rate" hint="Fail-open: mesh failure passes traffic through unobserved">
          <RangeInput value={cfg.failureRate} onChange={v => patch({ failureRate: v })} />
        </Field>
      </FieldGroup>
    </>
  )
}

function ToolRegistryFields({ nodeId, cfg }: { nodeId: string; cfg: ToolRegistryConfig }) {
  const patch = (p: Partial<ToolRegistryConfig>) =>
    runInAction(() => graphStore.updateNodeConfig(nodeId, { config: { ...cfg, ...p } } as any))
  return (
    <>
      <FieldGroup>
        <Field label="Lookup capacity (req/s)"><NumInput value={cfg.capacity} onChange={v => patch({ capacity: v })} min={1} /></Field>
        <Field label="Registered tools" hint="More tools = higher lookup latency (log scale)">
          <NumInput value={cfg.toolCount} onChange={v => patch({ toolCount: v })} min={1} max={1000} />
        </Field>
        <Field label="Base lookup latency (ms)"><NumInput value={cfg.latencyMs} onChange={v => patch({ latencyMs: v })} min={1} /></Field>
      </FieldGroup>
      <FieldGroup>
        <Field label="Failure rate"><RangeInput value={cfg.failureRate} onChange={v => patch({ failureRate: v })} /></Field>
      </FieldGroup>
    </>
  )
}

function MemoryFabricFields({ nodeId, cfg }: { nodeId: string; cfg: MemoryFabricConfig }) {
  const patch = (p: Partial<MemoryFabricConfig>) =>
    runInAction(() => graphStore.updateNodeConfig(nodeId, { config: { ...cfg, ...p } } as any))
  return (
    <>
      <FieldGroup>
        <Field label="Read capacity (ops/s)"><NumInput value={cfg.readCapacity} onChange={v => patch({ readCapacity: v })} min={1} /></Field>
        <Field label="Write capacity (ops/s)" hint="Agent state is write-heavy — 60% of ops are writes">
          <NumInput value={cfg.writeCapacity} onChange={v => patch({ writeCapacity: v })} min={1} />
        </Field>
        <Field label="Session capacity" hint="Max concurrent agent sessions held in memory">
          <NumInput value={cfg.sessionCapacity} onChange={v => patch({ sessionCapacity: v })} min={1} />
        </Field>
        <Field label="Read/write latency (ms)"><NumInput value={cfg.latencyMs} onChange={v => patch({ latencyMs: v })} min={1} /></Field>
      </FieldGroup>
      <FieldGroup>
        <Field label="Failure rate"><RangeInput value={cfg.failureRate} onChange={v => patch({ failureRate: v })} /></Field>
      </FieldGroup>
    </>
  )
}

// ── Structural node config (label + notes only) ───────────────────────────────

function StructuralFields({ nodeId }: { nodeId: string }) {
  const sn = graphStore.structuralNodes.get(nodeId)
  if (!sn) return null
  return (
    <Field label="Notes">
      <textarea
        value={sn.notes ?? ''}
        onChange={e => runInAction(() => graphStore.updateStructuralNode(nodeId, { notes: e.target.value }))}
        rows={3}
        className={inputCls + ' resize-none'}
        placeholder="Optional annotation…"
      />
    </Field>
  )
}

// ── Cost placeholder ──────────────────────────────────────────────────────────
// TODO: replace hardcoded rates with per-node instance/SKU picker + cloud
// provider pricing API. See CostStore.ts BASE_HR / PER_MILLION_REQ tables.

function CostPlaceholder({ nodeType }: { nodeType: NodeType }) {
  if (nodeType === NodeType.Client) return null
  const baseHr = (costStore as any)['currentRatePerHr'] // just for display hint
  void baseHr // unused — we read from the static table directly via store internals

  // Read the hardcoded base rate directly from the pricing table in CostStore
  // so the panel reflects what the cost panel will charge for this node type.
  // This is a display-only hint until real pricing is wired in.
  const BASE_HR_HINT: Partial<Record<NodeType, number>> = {
    [NodeType.LoadBalancer]:      0.025,
    [NodeType.ApiServer]:         0.042,
    [NodeType.Cache]:             0.068,
    [NodeType.Database]:          0.115,
    [NodeType.Queue]:             0.001,
    [NodeType.CDN]:               0.010,
    [NodeType.Microservice]:      0.042,
    [NodeType.ApiGateway]:        0.035,
    [NodeType.Serverless]:        0,
    [NodeType.Worker]:            0.021,
    [NodeType.PubSub]:            0.002,
    [NodeType.Stream]:            0.015,
    [NodeType.RateLimiter]:       0,
    [NodeType.ObjectStore]:       0.023,
    [NodeType.ExternalService]:   0,
    [NodeType.LLMGateway]:        0,
    [NodeType.VectorDB]:          0.096,
    [NodeType.AgentOrchestrator]: 0.500,
    [NodeType.DNS]:               0.008,
    [NodeType.NoSQLStore]:        0.095,
    [NodeType.WAF]:               0.080,
    [NodeType.GraphDB]:           0.350,
    [NodeType.ObservabilityMesh]: 0.050,
    [NodeType.ToolRegistry]:      0.021,
    [NodeType.MemoryFabric]:      0.068,
  }
  const rate = BASE_HR_HINT[nodeType]

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <DollarSign size={10} className="text-app-text-3" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-app-text-3">Cost</p>
      </div>
      <div className="flex flex-col gap-2 bg-app-elevated/40 rounded-xl px-3 py-3 border border-app-border/60 border-dashed opacity-60">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-app-text-3">Current rate</span>
          <span className="text-[11px] font-bold tabular-nums text-app-text-2">
            {rate !== undefined && rate > 0 ? `$${rate.toFixed(3)}/hr` : 'Per request'}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-app-text-2">Instance / SKU</span>
          <input
            disabled
            placeholder="e.g. t3.medium, db.r6g.large…"
            className="text-xs border border-app-border/50 bg-app-elevated/50 text-app-text-3 rounded-lg px-2.5 py-1.5 w-full cursor-not-allowed"
          />
        </div>
        <p className="text-[10px] text-app-text-3 leading-relaxed italic">
          Custom instance pricing coming soon — rates sourced from cloud provider APIs.
        </p>
      </div>
    </div>
  )
}

// ── Main ConfigPanel ──────────────────────────────────────────────────────────

const ConfigPanel = observer(() => {
  const nodeId = graphStore.selectedNodeId
  const simNode        = nodeId ? graphStore.nodes.get(nodeId) : null
  const structuralNode = nodeId ? graphStore.structuralNodes.get(nodeId) : null

  if (!nodeId || (!simNode && !structuralNode)) {
    return (
      <aside className="w-64 bg-app-surface border-l border-app-border flex flex-col items-center justify-center text-center p-6 shrink-0">
        <div className="w-12 h-12 rounded-2xl bg-app-elevated border border-app-border flex items-center justify-center mb-4">
          <span className="text-app-text-3 text-xl select-none">↖</span>
        </div>
        <p className="text-sm font-medium text-app-text-2">Select a node</p>
        <p className="text-xs text-app-text-3 mt-1 leading-relaxed">Click any node on the canvas to configure it</p>
      </aside>
    )
  }

  // ── Structural node panel ──────────────────────────────────────────────────
  if (structuralNode) {
    const display = STRUCTURAL_DISPLAY[structuralNode.structuralType]
    const Icon = display.icon
    return (
      <aside className="w-64 bg-app-surface border-l border-app-border flex flex-col shrink-0 overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b border-app-border">
          <div className="flex items-start justify-between gap-2">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${display.colorClass} border ${display.borderClass}`}>
              <Icon size={16} className={display.textClass} strokeWidth={1.8} />
            </div>
            <button onClick={() => runInAction(() => graphStore.removeStructuralNode(nodeId))}
              className="text-app-text-3 hover:text-red-400 p-1 rounded-lg hover:bg-red-500/10 transition-colors mt-0.5" title="Delete">
              <Trash2 size={13} strokeWidth={1.8} />
            </button>
          </div>
          <p className="text-sm font-semibold text-app-text mt-2">{display.label}</p>
          <p className="text-[11px] text-app-text-3 mt-0.5">Container — engine ignores this</p>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3 no-scrollbar">
          <FieldGroup>
            <Field label="Label">
              <input type="text" value={structuralNode.label}
                onChange={e => runInAction(() => graphStore.updateStructuralNode(nodeId, { label: e.target.value }))}
                className={inputCls} />
            </Field>
            <StructuralFields nodeId={nodeId} />
          </FieldGroup>
        </div>
      </aside>
    )
  }

  // ── Simulation node panel ──────────────────────────────────────────────────
  const node = simNode!
  const display = NODE_DISPLAY[node.nodeType]
  const Icon = display.icon

  function renderConfigFields() {
    switch (node.nodeType) {
      case NodeType.Client:            return <ClientFields nodeId={nodeId!} cfg={node.config as ClientConfig} />
      case NodeType.LoadBalancer:      return <LBFields nodeId={nodeId!} cfg={node.config as LoadBalancerConfig} />
      case NodeType.Cache:             return <CacheFields nodeId={nodeId!} cfg={node.config as CacheConfig} />
      case NodeType.CDN:               return <CacheFields nodeId={nodeId!} cfg={node.config as CDNConfig} />
      case NodeType.Queue:             return <QueueFields nodeId={nodeId!} cfg={node.config as QueueConfig} />
      case NodeType.ApiGateway:        return <ApiGatewayFields nodeId={nodeId!} cfg={node.config as ApiGatewayConfig} />
      case NodeType.Serverless:        return <ServerlessFields nodeId={nodeId!} cfg={node.config as ServerlessConfig} />
      case NodeType.Worker:            return <WorkerFields nodeId={nodeId!} cfg={node.config as WorkerConfig} />
      case NodeType.PubSub:            return <PubSubFields nodeId={nodeId!} cfg={node.config as PubSubConfig} />
      case NodeType.Stream:            return <StreamFields nodeId={nodeId!} cfg={node.config as StreamConfig} />
      case NodeType.RateLimiter:       return <RateLimiterFields nodeId={nodeId!} cfg={node.config as RateLimiterConfig} />
      case NodeType.ObjectStore:       return <ObjectStoreFields nodeId={nodeId!} cfg={node.config as ObjectStoreConfig} />
      case NodeType.ExternalService:   return <ExternalServiceFields nodeId={nodeId!} cfg={node.config as ExternalServiceConfig} />
      case NodeType.LLMGateway:        return <LLMGatewayFields nodeId={nodeId!} cfg={node.config as LLMGatewayConfig} />
      case NodeType.VectorDB:          return <VectorDBFields nodeId={nodeId!} cfg={node.config as VectorDBConfig} />
      case NodeType.AgentOrchestrator: return <AgentOrchestratorFields nodeId={nodeId!} cfg={node.config as AgentOrchestratorConfig} />
      case NodeType.DNS:               return <DNSFields nodeId={nodeId!} cfg={node.config as DNSConfig} />
      case NodeType.NoSQLStore:        return <NoSQLStoreFields nodeId={nodeId!} cfg={node.config as NoSQLStoreConfig} />
      case NodeType.WAF:               return <WAFFields nodeId={nodeId!} cfg={node.config as WAFConfig} />
      case NodeType.GraphDB:           return <GraphDBFields nodeId={nodeId!} cfg={node.config as GraphDBConfig} />
      case NodeType.ObservabilityMesh: return <ObservabilityMeshFields nodeId={nodeId!} cfg={node.config as ObservabilityMeshConfig} />
      case NodeType.ToolRegistry:      return <ToolRegistryFields nodeId={nodeId!} cfg={node.config as ToolRegistryConfig} />
      case NodeType.MemoryFabric:      return <MemoryFabricFields nodeId={nodeId!} cfg={node.config as MemoryFabricConfig} />
      default:                         return <BaseFields nodeId={nodeId!} cfg={node.config as BaseNodeConfig} />
    }
  }

  return (
    <aside className="w-64 bg-app-surface border-l border-app-border flex flex-col shrink-0 overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-app-border">
        <div className="flex items-start justify-between gap-2">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${display.colorClass} border ${display.borderClass}`}>
            <Icon size={16} className={display.textClass} strokeWidth={1.8} />
          </div>
          <button onClick={() => runInAction(() => graphStore.removeNode(nodeId!))}
            className="text-app-text-3 hover:text-red-400 p-1 rounded-lg hover:bg-red-500/10 transition-colors mt-0.5" title="Delete node">
            <Trash2 size={13} strokeWidth={1.8} />
          </button>
        </div>
        <p className="text-[10px] font-semibold text-app-text-3 uppercase tracking-widest mt-2">{display.label}</p>
        <p className="text-xs text-app-text-2 mt-0.5 leading-relaxed line-clamp-2">{display.description}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3 no-scrollbar">
        <FieldGroup>
          <Field label="Name">
            <input type="text" value={node.label} maxLength={40}
              onChange={e => runInAction(() => graphStore.updateNodeConfig(nodeId!, { label: e.target.value } as any))}
              className={inputCls} />
          </Field>
        </FieldGroup>
        {renderConfigFields()}
        <CostPlaceholder nodeType={node.nodeType} />
      </div>
    </aside>
  )
})

export default ConfigPanel
