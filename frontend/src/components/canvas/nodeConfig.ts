import { nanoid } from 'nanoid'
import {
  NodeType,
  StructuralNodeType,
  LBStrategy,
  RateLimitAlgorithm,
  RejectBehavior,
} from '../../types/topology'
import type { SimNode, StructuralNode, CanvasPosition } from '../../types/topology'

// ─── Simulation node display ──────────────────────────────────────────────────

export interface NodeDisplayConfig {
  label: string
  icon: string
  description: string
  colorClass: string
  borderClass: string
  textClass: string
}

export const NODE_DISPLAY: Record<NodeType, NodeDisplayConfig> = {
  // ── Original 8 ────────────────────────────────────────────────────────────
  [NodeType.Client]: {
    label: 'Client', icon: '💻',
    description: 'Traffic source — generates requests',
    colorClass: 'bg-blue-50', borderClass: 'border-blue-300', textClass: 'text-blue-700',
  },
  [NodeType.LoadBalancer]: {
    label: 'Load Balancer', icon: '⚖️',
    description: 'Distributes traffic across replicas',
    colorClass: 'bg-violet-50', borderClass: 'border-violet-300', textClass: 'text-violet-700',
  },
  [NodeType.ApiServer]: {
    label: 'API Server', icon: '🖥️',
    description: 'Handles HTTP requests & business logic',
    colorClass: 'bg-emerald-50', borderClass: 'border-emerald-300', textClass: 'text-emerald-700',
  },
  [NodeType.Cache]: {
    label: 'Cache', icon: '⚡',
    description: 'In-memory store with configurable hit rate',
    colorClass: 'bg-amber-50', borderClass: 'border-amber-300', textClass: 'text-amber-700',
  },
  [NodeType.Database]: {
    label: 'Database', icon: '🗄️',
    description: 'Persistent storage with capacity limits',
    colorClass: 'bg-orange-50', borderClass: 'border-orange-300', textClass: 'text-orange-700',
  },
  [NodeType.Queue]: {
    label: 'Queue', icon: '📬',
    description: 'Async message buffer with configurable depth',
    colorClass: 'bg-pink-50', borderClass: 'border-pink-300', textClass: 'text-pink-700',
  },
  [NodeType.CDN]: {
    label: 'CDN', icon: '🌐',
    description: 'Edge cache for static assets',
    colorClass: 'bg-teal-50', borderClass: 'border-teal-300', textClass: 'text-teal-700',
  },
  [NodeType.Microservice]: {
    label: 'Microservice', icon: '🔧',
    description: 'Isolated service with its own capacity',
    colorClass: 'bg-indigo-50', borderClass: 'border-indigo-300', textClass: 'text-indigo-700',
  },

  // ── New 11 ─────────────────────────────────────────────────────────────────
  [NodeType.ApiGateway]: {
    label: 'API Gateway', icon: '🔀',
    description: 'Rate limiting, auth overhead, L7 routing',
    colorClass: 'bg-purple-50', borderClass: 'border-purple-300', textClass: 'text-purple-700',
  },
  [NodeType.Serverless]: {
    label: 'Serverless', icon: 'λ',
    description: 'Cold start penalty, instant scale, concurrency limit',
    colorClass: 'bg-sky-50', borderClass: 'border-sky-300', textClass: 'text-sky-700',
  },
  [NodeType.Worker]: {
    label: 'Worker', icon: '⚙️',
    description: 'Async queue consumer, pull-based, job throughput',
    colorClass: 'bg-slate-50', borderClass: 'border-slate-300', textClass: 'text-slate-700',
  },
  [NodeType.PubSub]: {
    label: 'Pub/Sub', icon: '📡',
    description: 'Fan-out to N subscribers per message',
    colorClass: 'bg-rose-50', borderClass: 'border-rose-300', textClass: 'text-rose-700',
  },
  [NodeType.Stream]: {
    label: 'Stream', icon: '🌊',
    description: 'Ordered, partitioned, replayable — Kafka model',
    colorClass: 'bg-cyan-50', borderClass: 'border-cyan-300', textClass: 'text-cyan-700',
  },
  [NodeType.RateLimiter]: {
    label: 'Rate Limiter', icon: '🚦',
    description: 'Token bucket throttle — drop or queue excess traffic',
    colorClass: 'bg-red-50', borderClass: 'border-red-300', textClass: 'text-red-700',
  },
  [NodeType.ObjectStore]: {
    label: 'Object Store', icon: '🪣',
    description: 'S3-style blob store — MB/s throughput, no transactions',
    colorClass: 'bg-amber-50', borderClass: 'border-amber-400', textClass: 'text-amber-800',
  },
  [NodeType.ExternalService]: {
    label: 'External Service', icon: '🌍',
    description: 'Third-party dependency — high/variable latency, uncontrollable failure',
    colorClass: 'bg-gray-50', borderClass: 'border-gray-400', textClass: 'text-gray-700',
  },
  [NodeType.LLMGateway]: {
    label: 'LLM Gateway', icon: '🤖',
    description: 'Token-driven latency, TPM rate limits, streaming',
    colorClass: 'bg-purple-50', borderClass: 'border-purple-400', textClass: 'text-purple-800',
  },
  [NodeType.VectorDB]: {
    label: 'Vector DB', icon: '🔮',
    description: 'ANN queries — compute scales with index size & dimensions',
    colorClass: 'bg-fuchsia-50', borderClass: 'border-fuchsia-300', textClass: 'text-fuchsia-700',
  },
  [NodeType.AgentOrchestrator]: {
    label: 'Agent Orchestrator', icon: '🕸️',
    description: 'Multi-step AI agent loop — fan-out, coordination overhead',
    colorClass: 'bg-indigo-50', borderClass: 'border-indigo-400', textClass: 'text-indigo-800',
  },
}

// ─── Structural node display ──────────────────────────────────────────────────

export interface StructuralDisplayConfig {
  label: string
  icon: string
  colorClass: string   // semi-transparent fill
  borderClass: string
  textClass: string
  defaultWidth: number
  defaultHeight: number
}

export const STRUCTURAL_DISPLAY: Record<StructuralNodeType, StructuralDisplayConfig> = {
  [StructuralNodeType.VPC]:               { label: 'VPC',                icon: '☁️',  colorClass: 'bg-blue-50/60',   borderClass: 'border-blue-400',   textClass: 'text-blue-700',   defaultWidth: 600, defaultHeight: 400 },
  [StructuralNodeType.Subnet]:            { label: 'Subnet',             icon: '🔲',  colorClass: 'bg-sky-50/60',    borderClass: 'border-sky-400',    textClass: 'text-sky-700',    defaultWidth: 300, defaultHeight: 250 },
  [StructuralNodeType.AvailabilityZone]:  { label: 'Availability Zone',  icon: '🏢',  colorClass: 'bg-slate-50/60',  borderClass: 'border-slate-400',  textClass: 'text-slate-700',  defaultWidth: 400, defaultHeight: 350 },
  [StructuralNodeType.Region]:            { label: 'Region',             icon: '🗺️',  colorClass: 'bg-gray-50/60',   borderClass: 'border-gray-400',   textClass: 'text-gray-700',   defaultWidth: 700, defaultHeight: 500 },
  [StructuralNodeType.SecurityGroup]:     { label: 'Security Group',     icon: '🛡️',  colorClass: 'bg-yellow-50/60', borderClass: 'border-yellow-400', textClass: 'text-yellow-700', defaultWidth: 300, defaultHeight: 200 },
  [StructuralNodeType.ServiceMesh]:       { label: 'Service Mesh',       icon: '🕸️',  colorClass: 'bg-indigo-50/60', borderClass: 'border-indigo-400', textClass: 'text-indigo-700', defaultWidth: 400, defaultHeight: 300 },
  [StructuralNodeType.Firewall]:          { label: 'Firewall',           icon: '🔥',  colorClass: 'bg-red-50/60',    borderClass: 'border-red-400',    textClass: 'text-red-700',    defaultWidth: 200, defaultHeight: 150 },
  [StructuralNodeType.NATGateway]:        { label: 'NAT Gateway',        icon: '🔄',  colorClass: 'bg-green-50/60',  borderClass: 'border-green-400',  textClass: 'text-green-700',  defaultWidth: 200, defaultHeight: 150 },
  [StructuralNodeType.ToolRegistry]:      { label: 'Tool Registry',      icon: '🧰',  colorClass: 'bg-orange-50/60', borderClass: 'border-orange-400', textClass: 'text-orange-700', defaultWidth: 250, defaultHeight: 200 },
  [StructuralNodeType.MemoryFabric]:      { label: 'Memory Fabric',      icon: '🧠',  colorClass: 'bg-pink-50/60',   borderClass: 'border-pink-400',   textClass: 'text-pink-700',   defaultWidth: 250, defaultHeight: 200 },
  [StructuralNodeType.ShardAnnotation]:   { label: 'Shard',              icon: '⬡',   colorClass: 'bg-teal-50/60',   borderClass: 'border-teal-400',   textClass: 'text-teal-700',   defaultWidth: 250, defaultHeight: 150 },
  [StructuralNodeType.ReplicaAnnotation]: { label: 'Replica',            icon: '📋',  colorClass: 'bg-violet-50/60', borderClass: 'border-violet-400', textClass: 'text-violet-700', defaultWidth: 250, defaultHeight: 150 },
  [StructuralNodeType.TextLabel]:         { label: 'Text',               icon: '📝',  colorClass: 'bg-transparent',  borderClass: 'border-transparent', textClass: 'text-gray-700',  defaultWidth: 200, defaultHeight: 60  },
}

// ─── Default node factory ─────────────────────────────────────────────────────

export function createDefaultNode(nodeType: NodeType, position: CanvasPosition): Omit<SimNode, 'id'> {
  const label = NODE_DISPLAY[nodeType].label
  const base = { label, position }

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
    width: display.defaultWidth,
    height: display.defaultHeight,
  }
}
