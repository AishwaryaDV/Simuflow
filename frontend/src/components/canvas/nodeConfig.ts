import { nanoid as _nanoid } from 'nanoid'
import {
  NodeType, StructuralNodeType, LBStrategy, RateLimitAlgorithm, RejectBehavior,
} from '../../types/topology'
import type { SimNode, StructuralNode, CanvasPosition } from '../../types/topology'
import type { LucideIcon } from 'lucide-react'
import {
  Monitor, GitBranch, Server, Zap, Database, List, Globe, Box,
  Route, Settings2, Radio, Waves, Gauge, Archive,
  ExternalLink, Bot, BrainCircuit, Network, Cpu, Layers, Share2,
  Activity, Wrench as WrenchIcon, MemoryStick,
  // Structural
  CloudCog, LayoutGrid, Building2, Map, Shield, GitMerge,
  Flame, ArrowLeftRight, Wrench, Brain, Hexagon, Copy, Type,
} from 'lucide-react'

// ─── Simulation node display ──────────────────────────────────────────────────

export interface NodeDisplayConfig {
  label:       string
  icon:        LucideIcon
  description: string
  colorClass:  string   // node body bg (dark)
  borderClass: string
  textClass:   string
  category:    NodeCategory
}

export type NodeCategory =
  | 'Traffic & Edge'
  | 'Compute'
  | 'Storage'
  | 'Messaging'
  | 'AI & Agents'
  | 'External'

export const NODE_CATEGORIES: NodeCategory[] = [
  'Traffic & Edge',
  'Compute',
  'Storage',
  'Messaging',
  'AI & Agents',
  'External',
]

export const NODE_DISPLAY: Record<NodeType, NodeDisplayConfig> = {
  [NodeType.Client]: {
    label: 'Client', icon: Monitor, category: 'Traffic & Edge',
    description: 'Traffic source — generates requests at a configurable RPS',
    colorClass: 'bg-blue-950/60', borderClass: 'border-blue-700/70', textClass: 'text-blue-300',
  },
  [NodeType.LoadBalancer]: {
    label: 'Load Balancer', icon: GitBranch, category: 'Traffic & Edge',
    description: 'Distributes traffic across replicas using round-robin, least-connections or random',
    colorClass: 'bg-violet-950/60', borderClass: 'border-violet-700/70', textClass: 'text-violet-300',
  },
  [NodeType.ApiGateway]: {
    label: 'API Gateway', icon: Route, category: 'Traffic & Edge',
    description: 'L7 routing with per-client rate limiting and auth verification overhead',
    colorClass: 'bg-purple-950/60', borderClass: 'border-purple-700/70', textClass: 'text-purple-300',
  },
  [NodeType.CDN]: {
    label: 'CDN', icon: Globe, category: 'Traffic & Edge',
    description: 'Edge cache for static assets — high hit rate absorbs origin traffic',
    colorClass: 'bg-teal-950/60', borderClass: 'border-teal-700/70', textClass: 'text-teal-300',
  },
  [NodeType.RateLimiter]: {
    label: 'Rate Limiter', icon: Gauge, category: 'Traffic & Edge',
    description: 'Token-bucket throttle — drop or queue requests that exceed the limit',
    colorClass: 'bg-red-950/60', borderClass: 'border-red-700/70', textClass: 'text-red-300',
  },
  [NodeType.ApiServer]: {
    label: 'API Server', icon: Server, category: 'Compute',
    description: 'Handles synchronous HTTP requests — capacity, latency and failure configurable',
    colorClass: 'bg-emerald-950/60', borderClass: 'border-emerald-700/70', textClass: 'text-emerald-300',
  },
  [NodeType.Microservice]: {
    label: 'Microservice', icon: Box, category: 'Compute',
    description: 'Isolated service with its own capacity and failure envelope',
    colorClass: 'bg-indigo-950/60', borderClass: 'border-indigo-700/70', textClass: 'text-indigo-300',
  },
  [NodeType.Worker]: {
    label: 'Worker', icon: Settings2, category: 'Compute',
    description: 'Async queue consumer — pull-based, job throughput not RPS',
    colorClass: 'bg-slate-900/80', borderClass: 'border-slate-600/70', textClass: 'text-slate-300',
  },
  [NodeType.Serverless]: {
    label: 'Serverless', icon: Zap, category: 'Compute',
    description: 'Cold start penalty, instant scale, hard concurrency limit per invocation',
    colorClass: 'bg-sky-950/60', borderClass: 'border-sky-700/70', textClass: 'text-sky-300',
  },
  [NodeType.Database]: {
    label: 'Database', icon: Database, category: 'Storage',
    description: 'Persistent storage — low capacity ceiling teaches DB as the bottleneck',
    colorClass: 'bg-orange-950/60', borderClass: 'border-orange-700/70', textClass: 'text-orange-300',
  },
  [NodeType.Cache]: {
    label: 'Cache', icon: Cpu, category: 'Storage',
    description: 'In-memory store — hit rate determines how much traffic reaches the DB',
    colorClass: 'bg-amber-950/60', borderClass: 'border-amber-700/70', textClass: 'text-amber-300',
  },
  [NodeType.ObjectStore]: {
    label: 'Object Store', icon: Archive, category: 'Storage',
    description: 'S3-style blob store — MB/s throughput model, no transactions',
    colorClass: 'bg-yellow-950/60', borderClass: 'border-yellow-700/70', textClass: 'text-yellow-300',
  },
  [NodeType.VectorDB]: {
    label: 'Vector DB', icon: BrainCircuit, category: 'Storage',
    description: 'ANN similarity search — latency scales with index size and dimensions',
    colorClass: 'bg-fuchsia-950/60', borderClass: 'border-fuchsia-700/70', textClass: 'text-fuchsia-300',
  },
  [NodeType.Queue]: {
    label: 'Queue', icon: List, category: 'Messaging',
    description: 'Point-to-point async buffer — depth and delay configurable',
    colorClass: 'bg-pink-950/60', borderClass: 'border-pink-700/70', textClass: 'text-pink-300',
  },
  [NodeType.PubSub]: {
    label: 'Pub / Sub', icon: Radio, category: 'Messaging',
    description: 'Fan-out to N subscribers — every subscriber gets every message',
    colorClass: 'bg-rose-950/60', borderClass: 'border-rose-700/70', textClass: 'text-rose-300',
  },
  [NodeType.Stream]: {
    label: 'Stream', icon: Waves, category: 'Messaging',
    description: 'Ordered, partitioned, replayable log — Kafka model',
    colorClass: 'bg-cyan-950/60', borderClass: 'border-cyan-700/70', textClass: 'text-cyan-300',
  },
  [NodeType.LLMGateway]: {
    label: 'LLM Gateway', icon: Bot, category: 'AI & Agents',
    description: 'Routes to LLM provider — token-driven latency, TPM rate limits, streaming',
    colorClass: 'bg-purple-950/70', borderClass: 'border-purple-600/70', textClass: 'text-purple-200',
  },
  [NodeType.AgentOrchestrator]: {
    label: 'Agent Orchestrator', icon: Network, category: 'AI & Agents',
    description: 'Multi-step agent loop — fan-out to tools, coordination overhead per step',
    colorClass: 'bg-indigo-950/70', borderClass: 'border-indigo-600/70', textClass: 'text-indigo-200',
  },
  [NodeType.ExternalService]: {
    label: 'External Service', icon: ExternalLink, category: 'External',
    description: 'Third-party dependency — uncontrollable latency variance and failure',
    colorClass: 'bg-gray-900/80', borderClass: 'border-gray-600/70', textClass: 'text-gray-300',
  },
  [NodeType.DNS]: {
    label: 'DNS', icon: Globe, category: 'Traffic & Edge',
    description: 'Domain resolution with TTL-based caching — high TTL reduces resolver load',
    colorClass: 'bg-cyan-950/60', borderClass: 'border-cyan-700/70', textClass: 'text-cyan-300',
  },
  [NodeType.NoSQLStore]: {
    label: 'NoSQL Store', icon: Layers, category: 'Storage',
    description: 'Horizontally scalable key-value store — separate read/write capacity, no transactions',
    colorClass: 'bg-lime-950/60', borderClass: 'border-lime-700/70', textClass: 'text-lime-300',
  },
  [NodeType.WAF]: {
    label: 'WAF', icon: Shield, category: 'Traffic & Edge',
    description: 'Web Application Firewall — inspects traffic, blocks malicious requests before origin',
    colorClass: 'bg-orange-950/60', borderClass: 'border-orange-700/70', textClass: 'text-orange-300',
  },
  [NodeType.GraphDB]: {
    label: 'Graph DB', icon: Share2, category: 'Storage',
    description: 'Graph database — optimised for relationship traversal queries and connected data',
    colorClass: 'bg-violet-950/60', borderClass: 'border-violet-700/70', textClass: 'text-violet-300',
  },
  [NodeType.ObservabilityMesh]: {
    label: 'Observability Mesh', icon: Activity, category: 'Compute',
    description: 'Sidecar mesh — samples traces, exports metrics, adds per-request inspection overhead',
    colorClass: 'bg-teal-950/60', borderClass: 'border-teal-700/70', textClass: 'text-teal-300',
  },
  [NodeType.ToolRegistry]: {
    label: 'Tool Registry', icon: WrenchIcon, category: 'AI & Agents',
    description: 'Tool discovery and routing — agents query this to resolve capabilities before execution',
    colorClass: 'bg-amber-950/60', borderClass: 'border-amber-700/70', textClass: 'text-amber-300',
  },
  [NodeType.MemoryFabric]: {
    label: 'Memory Fabric', icon: MemoryStick, category: 'AI & Agents',
    description: 'Persistent working memory — stores agent session state, intermediate plans, tool results',
    colorClass: 'bg-pink-950/60', borderClass: 'border-pink-700/70', textClass: 'text-pink-300',
  },
}

// ─── Structural node display ──────────────────────────────────────────────────

export interface StructuralDisplayConfig {
  label:         string
  icon:          LucideIcon
  colorClass:    string
  borderClass:   string
  textClass:     string
  defaultWidth:  number
  defaultHeight: number
}

export const STRUCTURAL_DISPLAY: Record<StructuralNodeType, StructuralDisplayConfig> = {
  [StructuralNodeType.VPC]:               { label: 'VPC',               icon: CloudCog,       colorClass: 'bg-blue-950/20',    borderClass: 'border-blue-600/40',    textClass: 'text-blue-400',    defaultWidth: 600, defaultHeight: 400 },
  [StructuralNodeType.Subnet]:            { label: 'Subnet',            icon: LayoutGrid,     colorClass: 'bg-sky-950/20',     borderClass: 'border-sky-600/40',     textClass: 'text-sky-400',     defaultWidth: 300, defaultHeight: 250 },
  [StructuralNodeType.AvailabilityZone]:  { label: 'Availability Zone', icon: Building2,      colorClass: 'bg-slate-900/30',   borderClass: 'border-slate-500/40',   textClass: 'text-slate-400',   defaultWidth: 400, defaultHeight: 350 },
  [StructuralNodeType.Region]:            { label: 'Region',            icon: Map,            colorClass: 'bg-gray-900/20',    borderClass: 'border-gray-500/40',    textClass: 'text-gray-400',    defaultWidth: 700, defaultHeight: 500 },
  [StructuralNodeType.SecurityGroup]:     { label: 'Security Group',    icon: Shield,         colorClass: 'bg-yellow-950/20',  borderClass: 'border-yellow-600/40',  textClass: 'text-yellow-400',  defaultWidth: 300, defaultHeight: 200 },
  [StructuralNodeType.ServiceMesh]:       { label: 'Service Mesh',      icon: GitMerge,       colorClass: 'bg-indigo-950/20',  borderClass: 'border-indigo-600/40',  textClass: 'text-indigo-400',  defaultWidth: 400, defaultHeight: 300 },
  [StructuralNodeType.Firewall]:          { label: 'Firewall',          icon: Flame,          colorClass: 'bg-red-950/20',     borderClass: 'border-red-600/40',     textClass: 'text-red-400',     defaultWidth: 200, defaultHeight: 150 },
  [StructuralNodeType.NATGateway]:        { label: 'NAT Gateway',       icon: ArrowLeftRight, colorClass: 'bg-green-950/20',   borderClass: 'border-green-600/40',   textClass: 'text-green-400',   defaultWidth: 200, defaultHeight: 150 },
  [StructuralNodeType.ToolRegistry]:      { label: 'Tool Registry',     icon: Wrench,         colorClass: 'bg-orange-950/20',  borderClass: 'border-orange-600/40',  textClass: 'text-orange-400',  defaultWidth: 250, defaultHeight: 200 },
  [StructuralNodeType.MemoryFabric]:      { label: 'Memory Fabric',     icon: Brain,          colorClass: 'bg-pink-950/20',    borderClass: 'border-pink-600/40',    textClass: 'text-pink-400',    defaultWidth: 250, defaultHeight: 200 },
  [StructuralNodeType.ShardAnnotation]:   { label: 'Shard',             icon: Hexagon,        colorClass: 'bg-teal-950/20',    borderClass: 'border-teal-600/40',    textClass: 'text-teal-400',    defaultWidth: 250, defaultHeight: 150 },
  [StructuralNodeType.ReplicaAnnotation]: { label: 'Replica',           icon: Copy,           colorClass: 'bg-violet-950/20',  borderClass: 'border-violet-600/40',  textClass: 'text-violet-400',  defaultWidth: 250, defaultHeight: 150 },
  [StructuralNodeType.TextLabel]:         { label: 'Text',              icon: Type,           colorClass: 'bg-transparent',   borderClass: 'border-transparent',    textClass: 'text-app-text-2',  defaultWidth: 200, defaultHeight: 60  },
}

// ─── Default node factory ─────────────────────────────────────────────────────

export function createDefaultNode(nodeType: NodeType, position: CanvasPosition): Omit<SimNode, 'id'> {
  const label = NODE_DISPLAY[nodeType].label
  const base  = { label, position }

  switch (nodeType) {
    case NodeType.Client:
      return { ...base, nodeType, config: { rps: 100, burst: false } }
    case NodeType.LoadBalancer:
      return { ...base, nodeType, config: { capacity: 10_000, latencyMs: 2, failureRate: 0, timeoutMs: 5000, strategy: LBStrategy.RoundRobin, replicas: 2 } }
    case NodeType.ApiServer:
      return { ...base, nodeType, config: { capacity: 1000, latencyMs: 50, failureRate: 0.01, timeoutMs: 5000 } }
    case NodeType.Cache:
      return { ...base, nodeType, config: { capacity: 5000, latencyMs: 5, failureRate: 0, timeoutMs: 1000, hitRate: 0.8 } }
    case NodeType.Database:
      return { ...base, nodeType, config: { capacity: 500, latencyMs: 20, failureRate: 0.001, timeoutMs: 10_000 } }
    case NodeType.Queue:
      return { ...base, nodeType, config: { delayMs: 100, maxDepth: 1000 } }
    case NodeType.CDN:
      return { ...base, nodeType, config: { capacity: 50_000, latencyMs: 10, failureRate: 0, timeoutMs: 2000, hitRate: 0.9 } }
    case NodeType.Microservice:
      return { ...base, nodeType, config: { capacity: 1000, latencyMs: 30, failureRate: 0.01, timeoutMs: 5000 } }
    case NodeType.ApiGateway:
      return { ...base, nodeType, config: { capacity: 5000, latencyMs: 5, failureRate: 0, timeoutMs: 5000, rateLimit: 1000, authOverheadMs: 10 } }
    case NodeType.Serverless:
      return { ...base, nodeType, config: { coldStartMs: 800, warmLatencyMs: 30, coldStartProbability: 0.1, concurrencyLimit: 100, failureRate: 0.01, timeoutMs: 30_000 } }
    case NodeType.Worker:
      return { ...base, nodeType, config: { throughput: 50, processingMs: 200, failureRate: 0.02, retries: 3, concurrency: 5 } }
    case NodeType.PubSub:
      return { ...base, nodeType, config: { subscriberCount: 3, deliveryLatencyMs: 10, failureRate: 0.001, maxDepth: 10_000 } }
    case NodeType.Stream:
      return { ...base, nodeType, config: { partitions: 4, throughput: 10_000, retentionMs: 604_800_000, consumerGroups: 2, failureRate: 0.001 } }
    case NodeType.RateLimiter:
      return { ...base, nodeType, config: { rateLimit: 500, burstSize: 100, algorithm: RateLimitAlgorithm.TokenBucket, rejectBehavior: RejectBehavior.Drop } }
    case NodeType.ObjectStore:
      return { ...base, nodeType, config: { readThroughputMbps: 5000, writeThroughputMbps: 1000, latencyMs: 20, failureRate: 0.0001, maxObjectSizeMb: 5120 } }
    case NodeType.ExternalService:
      return { ...base, nodeType, config: { latencyMs: 150, p99LatencyMs: 800, failureRate: 0.02, timeoutMs: 5000, rateLimit: 100 } }
    case NodeType.LLMGateway:
      return { ...base, nodeType, config: { tokensPerSecond: 50, avgPromptTokens: 500, avgCompletionTokens: 300, rateLimitTpm: 90_000, failureRate: 0.02, timeoutMs: 60_000 } }
    case NodeType.VectorDB:
      return { ...base, nodeType, config: { queryCapacity: 200, indexSizeM: 1, dimensions: 1536, queryLatencyMs: 50, failureRate: 0.005 } }
    case NodeType.AgentOrchestrator:
      return { ...base, nodeType, config: { maxConcurrentAgents: 10, stepLatencyMs: 50, maxSteps: 20, failureRate: 0.05, timeoutMs: 120_000 } }
    case NodeType.DNS:
      return { ...base, nodeType, config: { ttlSeconds: 300, regions: 4, latencyMs: 5, failureRate: 0.0001 } }
    case NodeType.NoSQLStore:
      return { ...base, nodeType, config: { readCapacity: 5000, writeCapacity: 1000, replicationFactor: 3, latencyMs: 5, failureRate: 0.001 } }
    case NodeType.WAF:
      return { ...base, nodeType, config: { inspectionCapacity: 50_000, blockRate: 0.01, latencyMs: 2, failureRate: 0 } }
    case NodeType.GraphDB:
      return { ...base, nodeType, config: { queryCapacity: 2000, writeCapacity: 500, latencyMs: 20, failureRate: 0.001 } }
    case NodeType.ObservabilityMesh:
      return { ...base, nodeType, config: { inspectionRps: 20_000, samplingRate: 0.1, latencyMs: 3, failureRate: 0 } }
    case NodeType.ToolRegistry:
      return { ...base, nodeType, config: { capacity: 5000, toolCount: 20, latencyMs: 10, failureRate: 0.001 } }
    case NodeType.MemoryFabric:
      return { ...base, nodeType, config: { readCapacity: 10_000, writeCapacity: 5000, sessionCapacity: 500, latencyMs: 8, failureRate: 0.001 } }
  }
}

export function createDefaultStructuralNode(
  structuralType: StructuralNodeType,
  position: CanvasPosition,
): Omit<StructuralNode, 'id'> {
  const display = STRUCTURAL_DISPLAY[structuralType]
  return {
    label: display.label,
    structuralType,
    position,
    width:  display.defaultWidth,
    height: display.defaultHeight,
  }
}
