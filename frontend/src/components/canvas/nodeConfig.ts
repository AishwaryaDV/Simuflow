import { nanoid } from 'nanoid'
import { NodeType, LBStrategy } from '../../types/topology'
import type { SimNode, CanvasPosition } from '../../types/topology'

export interface NodeDisplayConfig {
  label: string
  icon: string
  description: string
  colorClass: string  // Tailwind bg colour
  borderClass: string // Tailwind border colour
  textClass: string   // Tailwind text colour
}

export const NODE_DISPLAY: Record<NodeType, NodeDisplayConfig> = {
  [NodeType.Client]: {
    label: 'Client',
    icon: '💻',
    description: 'Traffic source — generates requests',
    colorClass: 'bg-blue-50',
    borderClass: 'border-blue-300',
    textClass: 'text-blue-700',
  },
  [NodeType.LoadBalancer]: {
    label: 'Load Balancer',
    icon: '⚖️',
    description: 'Distributes traffic across replicas',
    colorClass: 'bg-violet-50',
    borderClass: 'border-violet-300',
    textClass: 'text-violet-700',
  },
  [NodeType.ApiServer]: {
    label: 'API Server',
    icon: '🖥️',
    description: 'Handles HTTP requests & business logic',
    colorClass: 'bg-emerald-50',
    borderClass: 'border-emerald-300',
    textClass: 'text-emerald-700',
  },
  [NodeType.Cache]: {
    label: 'Cache',
    icon: '⚡',
    description: 'In-memory store with configurable hit rate',
    colorClass: 'bg-amber-50',
    borderClass: 'border-amber-300',
    textClass: 'text-amber-700',
  },
  [NodeType.Database]: {
    label: 'Database',
    icon: '🗄️',
    description: 'Persistent storage with capacity limits',
    colorClass: 'bg-orange-50',
    borderClass: 'border-orange-300',
    textClass: 'text-orange-700',
  },
  [NodeType.Queue]: {
    label: 'Queue',
    icon: '📬',
    description: 'Async message buffer with configurable depth',
    colorClass: 'bg-pink-50',
    borderClass: 'border-pink-300',
    textClass: 'text-pink-700',
  },
  [NodeType.CDN]: {
    label: 'CDN',
    icon: '🌐',
    description: 'Edge cache for static assets',
    colorClass: 'bg-teal-50',
    borderClass: 'border-teal-300',
    textClass: 'text-teal-700',
  },
  [NodeType.Microservice]: {
    label: 'Microservice',
    icon: '🔧',
    description: 'Isolated service with its own capacity',
    colorClass: 'bg-indigo-50',
    borderClass: 'border-indigo-300',
    textClass: 'text-indigo-700',
  },
}

/** Create a SimNode with sensible defaults for the given type. */
export function createDefaultNode(nodeType: NodeType, position: CanvasPosition): Omit<SimNode, 'id'> {
  const display = NODE_DISPLAY[nodeType]
  const base = { label: display.label, position }

  switch (nodeType) {
    case NodeType.Client:
      return { ...base, nodeType, config: { rps: 100, burst: false } }
    case NodeType.LoadBalancer:
      return {
        ...base, nodeType,
        config: { capacity: 10_000, latencyMs: 2, failureRate: 0, timeoutMs: 5000, strategy: LBStrategy.RoundRobin, replicas: 2 },
      }
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
  }
}
