/**
 * validation/rules.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * THE canonical list of all topology validation rules.
 *
 * To add a rule    — append a new entry to the relevant section below.
 * To remove a rule — delete or comment out the entry.
 * To modify a rule — edit the `check` function or change the `title`/`message`.
 *
 * The validator in validator.ts picks up this array automatically.
 * Rules are evaluated in order; all rules always run (no short-circuit).
 *
 * Severity guide
 * ──────────────
 * error    — simulation is blocked. topology is structurally broken.
 * warning  — simulation is allowed with "Run anyway". results may be misleading.
 * advisory — simulation always runs. surfaced as passive hints in the UI.
 */

import { NodeType } from '../types/topology'
import type { ValidationRule, ValidationIssue, ValidationContext } from './types'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns node IDs that have at least one incoming edge. */
function nodesWithIncoming(ctx: ValidationContext): Set<string> {
  const s = new Set<string>()
  ctx.edges.forEach(e => s.add(e.targetId))
  return s
}

/** Returns node IDs that have at least one outgoing edge. */
function nodesWithOutgoing(ctx: ValidationContext): Set<string> {
  const s = new Set<string>()
  ctx.edges.forEach(e => s.add(e.sourceId))
  return s
}

/** Returns node IDs reachable from any Client via BFS. */
function reachableFromClients(ctx: ValidationContext): Set<string> {
  const clientIds = [...ctx.nodes.values()]
    .filter(n => n.nodeType === NodeType.Client)
    .map(n => n.id)

  const adjacency = new Map<string, string[]>()
  ctx.edges.forEach(e => {
    if (!adjacency.has(e.sourceId)) adjacency.set(e.sourceId, [])
    adjacency.get(e.sourceId)!.push(e.targetId)
  })

  const visited = new Set<string>(clientIds)
  const queue   = [...clientIds]
  while (queue.length) {
    const cur = queue.shift()!
    for (const next of (adjacency.get(cur) ?? [])) {
      if (!visited.has(next)) { visited.add(next); queue.push(next) }
    }
  }
  return visited
}

/** Detects cycles via DFS. Returns true if a cycle exists. */
function hasCycle(ctx: ValidationContext): boolean {
  const adjacency = new Map<string, string[]>()
  ctx.edges.forEach(e => {
    if (!adjacency.has(e.sourceId)) adjacency.set(e.sourceId, [])
    adjacency.get(e.sourceId)!.push(e.targetId)
  })

  const WHITE = 0, GRAY = 1, BLACK = 2
  const color = new Map<string, number>()
  ctx.nodes.forEach((_, id) => color.set(id, WHITE))

  function dfs(id: string): boolean {
    color.set(id, GRAY)
    for (const next of (adjacency.get(id) ?? [])) {
      if (color.get(next) === GRAY) return true
      if (color.get(next) === WHITE && dfs(next)) return true
    }
    color.set(id, BLACK)
    return false
  }

  for (const id of ctx.nodes.keys()) {
    if (color.get(id) === WHITE && dfs(id)) return true
  }
  return false
}

// ─────────────────────────────────────────────────────────────────────────────
// ERRORS — block simulation
// ─────────────────────────────────────────────────────────────────────────────

const ERROR_RULES: ValidationRule[] = [

  {
    id:       'ERR_NO_CLIENT',
    severity: 'error',
    title:    'No client node',
    check(ctx) {
      const hasClient = [...ctx.nodes.values()].some(n => n.nodeType === NodeType.Client)
      if (hasClient) return []
      return [{
        ruleId:          'ERR_NO_CLIENT',
        severity:        'error',
        title:           'No client node',
        message:         'Add a Client node — it is the only source of traffic in the simulation.',
        affectedNodeIds: [],
      }]
    },
  },

  {
    id:       'ERR_CLIENT_HAS_INCOMING',
    severity: 'error',
    title:    'Client node has incoming edges',
    check(ctx) {
      const withIncoming = nodesWithIncoming(ctx)
      const issues: ValidationIssue[] = []
      ctx.nodes.forEach((node, id) => {
        if (node.nodeType === NodeType.Client && withIncoming.has(id)) {
          issues.push({
            ruleId:          'ERR_CLIENT_HAS_INCOMING',
            severity:        'error',
            title:           'Client node has incoming edges',
            message:         `"${node.label}" is a traffic source — it cannot receive incoming edges. The engine ignores any inbound traffic on a Client.`,
            affectedNodeIds: [id],
          })
        }
      })
      return issues
    },
  },

  {
    id:       'ERR_SELF_LOOP',
    severity: 'error',
    title:    'Node connected to itself',
    check(ctx) {
      const issues: ValidationIssue[] = []
      ctx.edges.forEach(e => {
        if (e.sourceId === e.targetId) {
          const node = ctx.nodes.get(e.sourceId)
          issues.push({
            ruleId:          'ERR_SELF_LOOP',
            severity:        'error',
            title:           'Self-loop detected',
            message:         `"${node?.label ?? e.sourceId}" is connected to itself. This causes RPS to feed back into the same node on every tick.`,
            affectedNodeIds: [e.sourceId],
          })
        }
      })
      return issues
    },
  },

  {
    id:       'ERR_CYCLE',
    severity: 'error',
    title:    'Circular flow detected',
    check(ctx) {
      if (!hasCycle(ctx)) return []
      return [{
        ruleId:          'ERR_CYCLE',
        severity:        'error',
        title:           'Circular flow detected',
        message:         'The topology contains a cycle (A → B → … → A). RPS amplifies with each loop pass and the simulation diverges.',
        affectedNodeIds: [],
      }]
    },
  },

  {
    id:       'ERR_ISOLATED_NODE',
    severity: 'error',
    title:    'Node has no edges',
    check(ctx) {
      const withIncoming = nodesWithIncoming(ctx)
      const withOutgoing = nodesWithOutgoing(ctx)
      const issues: ValidationIssue[] = []
      ctx.nodes.forEach((node, id) => {
        if (!withIncoming.has(id) && !withOutgoing.has(id)) {
          issues.push({
            ruleId:          'ERR_ISOLATED_NODE',
            severity:        'error',
            title:           'Isolated node',
            message:         `"${node.label}" has no edges. It will never receive or send traffic and its metrics will always show idle.`,
            affectedNodeIds: [id],
          })
        }
      })
      return issues
    },
  },

  {
    id:       'ERR_QUEUE_NO_CONSUMER',
    severity: 'error',
    title:    'Queue or Stream has no consumer',
    check(ctx) {
      const withOutgoing = nodesWithOutgoing(ctx)
      const issues: ValidationIssue[] = []
      ctx.nodes.forEach((node, id) => {
        const isBuffer = node.nodeType === NodeType.Queue || node.nodeType === NodeType.Stream || node.nodeType === NodeType.PubSub
        if (isBuffer && !withOutgoing.has(id)) {
          issues.push({
            ruleId:          'ERR_QUEUE_NO_CONSUMER',
            severity:        'error',
            title:           'Queue / Stream has no consumer',
            message:         `"${node.label}" has no outgoing edges. Messages will enqueue forever — queue depth will grow unbounded and block the simulation.`,
            affectedNodeIds: [id],
          })
        }
      })
      return issues
    },
  },

]

// ─────────────────────────────────────────────────────────────────────────────
// WARNINGS — soft block, user can override with "Run anyway"
// ─────────────────────────────────────────────────────────────────────────────

const WARNING_RULES: ValidationRule[] = [

  {
    id:       'WARN_CLIENT_NO_OUTGOING',
    severity: 'warning',
    title:    'Client has no outgoing edge',
    check(ctx) {
      const withOutgoing = nodesWithOutgoing(ctx)
      const issues: ValidationIssue[] = []
      ctx.nodes.forEach((node, id) => {
        if (node.nodeType === NodeType.Client && !withOutgoing.has(id)) {
          issues.push({
            ruleId:          'WARN_CLIENT_NO_OUTGOING',
            severity:        'warning',
            title:           'Client has no outgoing edge',
            message:         `"${node.label}" generates traffic but has no outgoing edge — all requests are immediately dropped.`,
            affectedNodeIds: [id],
          })
        }
      })
      return issues
    },
  },

  {
    id:       'WARN_CLIENT_ZERO_RPS',
    severity: 'warning',
    title:    'Client RPS is zero',
    check(ctx) {
      const issues: ValidationIssue[] = []
      ctx.nodes.forEach((node, id) => {
        if (node.nodeType === NodeType.Client && (node.config as any).rps === 0) {
          issues.push({
            ruleId:          'WARN_CLIENT_ZERO_RPS',
            severity:        'warning',
            title:           'Client RPS is zero',
            message:         `"${node.label}" is set to 0 RPS — no traffic will be generated and every downstream node will show 0% utilisation.`,
            affectedNodeIds: [id],
          })
        }
      })
      return issues
    },
  },

  {
    id:       'WARN_UNREACHABLE_NODE',
    severity: 'warning',
    title:    'Node unreachable from any client',
    check(ctx) {
      const reachable = reachableFromClients(ctx)
      const issues: ValidationIssue[] = []
      ctx.nodes.forEach((node, id) => {
        if (node.nodeType !== NodeType.Client && !reachable.has(id)) {
          issues.push({
            ruleId:          'WARN_UNREACHABLE_NODE',
            severity:        'warning',
            title:           'Node unreachable from any client',
            message:         `"${node.label}" cannot be reached by traffic from any Client. Its metrics will always show idle.`,
            affectedNodeIds: [id],
          })
        }
      })
      return issues
    },
  },

  {
    id:       'WARN_CACHE_FULL_HIT_RATE',
    severity: 'warning',
    title:    'Cache / CDN hit rate is 100%',
    check(ctx) {
      const withOutgoing = nodesWithOutgoing(ctx)
      const issues: ValidationIssue[] = []
      ctx.nodes.forEach((node, id) => {
        const isCacheLike = node.nodeType === NodeType.Cache || node.nodeType === NodeType.CDN
        if (isCacheLike && (node.config as any).hitRate >= 1.0 && withOutgoing.has(id)) {
          issues.push({
            ruleId:          'WARN_CACHE_FULL_HIT_RATE',
            severity:        'warning',
            title:           'Cache hit rate is 100% — downstream nodes starved',
            message:         `"${node.label}" has hitRate = 1.0 so cache-miss traffic is 0 RPS. All nodes downstream will appear idle even under heavy load.`,
            affectedNodeIds: [id],
          })
        }
      })
      return issues
    },
  },

  {
    id:       'WARN_CACHE_ZERO_HIT_RATE',
    severity: 'warning',
    title:    'Cache / CDN hit rate is 0%',
    check(ctx) {
      const issues: ValidationIssue[] = []
      ctx.nodes.forEach((node, id) => {
        const isCacheLike = node.nodeType === NodeType.Cache || node.nodeType === NodeType.CDN
        if (isCacheLike && (node.config as any).hitRate === 0) {
          issues.push({
            ruleId:          'WARN_CACHE_ZERO_HIT_RATE',
            severity:        'warning',
            title:           'Cache hit rate is 0% — cache adds latency with no benefit',
            message:         `"${node.label}" has hitRate = 0.0 — every request is a miss. The cache adds overhead but never serves anything. This may be intentional (cold cache test).`,
            affectedNodeIds: [id],
          })
        }
      })
      return issues
    },
  },

  {
    id:       'WARN_DUPLICATE_EDGE',
    severity: 'warning',
    title:    'Duplicate edge between two nodes',
    check(ctx) {
      const seen  = new Set<string>()
      const issues: ValidationIssue[] = []
      ctx.edges.forEach(e => {
        const key = `${e.sourceId}→${e.targetId}`
        if (seen.has(key)) {
          const src = ctx.nodes.get(e.sourceId)
          const tgt = ctx.nodes.get(e.targetId)
          issues.push({
            ruleId:          'WARN_DUPLICATE_EDGE',
            severity:        'warning',
            title:           'Duplicate edge',
            message:         `There are multiple edges from "${src?.label}" to "${tgt?.label}". RPS on this path will be doubled — almost always a wiring mistake.`,
            affectedNodeIds: [e.sourceId, e.targetId],
          })
        }
        seen.add(key)
      })
      return issues
    },
  },

  {
    id:       'WARN_CLIENT_DIRECT_TO_STORAGE',
    severity: 'warning',
    title:    'Client connected directly to a storage node',
    check(ctx) {
      const storageTypes = new Set([
        NodeType.Database, NodeType.Cache, NodeType.ObjectStore,
        NodeType.VectorDB, NodeType.NoSQLStore, NodeType.GraphDB,
      ])
      const issues: ValidationIssue[] = []
      ctx.edges.forEach(e => {
        const src = ctx.nodes.get(e.sourceId)
        const tgt = ctx.nodes.get(e.targetId)
        if (src?.nodeType === NodeType.Client && tgt && storageTypes.has(tgt.nodeType)) {
          issues.push({
            ruleId:          'WARN_CLIENT_DIRECT_TO_STORAGE',
            severity:        'warning',
            title:           'Client connected directly to storage',
            message:         `"${src.label}" connects directly to "${tgt.label}" with no API or processing layer in between. Utilisation numbers will be architecturally unrealistic.`,
            affectedNodeIds: [src.id, tgt.id],
          })
        }
      })
      return issues
    },
  },

  {
    id:       'WARN_STORAGE_FEEDS_COMPUTE',
    severity: 'warning',
    title:    'Storage node has outgoing edge to a compute node',
    check(ctx) {
      const terminalTypes = new Set([
        NodeType.Database, NodeType.ObjectStore,
        NodeType.VectorDB, NodeType.NoSQLStore, NodeType.GraphDB,
      ])
      const computeTypes = new Set([
        NodeType.ApiServer, NodeType.Microservice, NodeType.ApiGateway,
        NodeType.LoadBalancer, NodeType.Serverless,
      ])
      const issues: ValidationIssue[] = []
      ctx.edges.forEach(e => {
        const src = ctx.nodes.get(e.sourceId)
        const tgt = ctx.nodes.get(e.targetId)
        if (src && terminalTypes.has(src.nodeType) && tgt && computeTypes.has(tgt.nodeType)) {
          issues.push({
            ruleId:          'WARN_STORAGE_FEEDS_COMPUTE',
            severity:        'warning',
            title:           'Storage node feeding into a compute node',
            message:         `"${src.label}" → "${tgt.label}" looks backwards — storage nodes are usually sinks, not sources of RPS.`,
            affectedNodeIds: [src.id, tgt.id],
          })
        }
      })
      return issues
    },
  },

  {
    id:       'WARN_LB_REPLICA_MISMATCH',
    severity: 'warning',
    title:    'Load Balancer replica count doesn't match outgoing edges',
    check(ctx) {
      const issues: ValidationIssue[] = []
      ctx.nodes.forEach((node, id) => {
        if (node.nodeType !== NodeType.LoadBalancer) return
        const outgoing  = ctx.edges.filter(e => e.sourceId === id).length
        const replicas  = (node.config as any).replicas ?? 1
        if (outgoing > 0 && outgoing !== replicas) {
          issues.push({
            ruleId:          'WARN_LB_REPLICA_MISMATCH',
            severity:        'warning',
            title:           'Load Balancer replica count mismatch',
            message:         `"${node.label}" has replicas = ${replicas} but ${outgoing} outgoing edge(s). The engine distributes load based on the config value, not the actual edge count.`,
            affectedNodeIds: [id],
          })
        }
      })
      return issues
    },
  },

  {
    id:       'WARN_PUBSUB_SUBSCRIBER_MISMATCH',
    severity: 'warning',
    title:    'Pub/Sub subscriber count doesn't match outgoing edges',
    check(ctx) {
      const issues: ValidationIssue[] = []
      ctx.nodes.forEach((node, id) => {
        if (node.nodeType !== NodeType.PubSub) return
        const outgoing     = ctx.edges.filter(e => e.sourceId === id).length
        const subscribers  = (node.config as any).subscriberCount ?? 1
        if (outgoing > 0 && outgoing !== subscribers) {
          issues.push({
            ruleId:          'WARN_PUBSUB_SUBSCRIBER_MISMATCH',
            severity:        'warning',
            title:           'Pub/Sub subscriber count mismatch',
            message:         `"${node.label}" has subscriberCount = ${subscribers} but ${outgoing} outgoing edge(s). Fan-out RPS will be based on the config value, not actual edges.`,
            affectedNodeIds: [id],
          })
        }
      })
      return issues
    },
  },

]

// ─────────────────────────────────────────────────────────────────────────────
// ADVISORIES — never block, surface as passive hints
// ─────────────────────────────────────────────────────────────────────────────

const ADVISORY_RULES: ValidationRule[] = [

  {
    id:       'ADV_WORKER_WILL_SATURATE',
    severity: 'advisory',
    title:    'Worker throughput below incoming RPS',
    check(ctx) {
      const issues: ValidationIssue[] = []
      ctx.nodes.forEach((node, id) => {
        if (node.nodeType !== NodeType.Worker) return
        const throughput   = (node.config as any).throughput ?? Infinity
        const incomingEdges = ctx.edges.filter(e => e.targetId === id)
        // Estimate inbound by summing client RPS across reachable paths — simple heuristic
        let estimatedInbound = 0
        incomingEdges.forEach(e => {
          const src = ctx.nodes.get(e.sourceId)
          if (src?.nodeType === NodeType.Client) {
            estimatedInbound += (src.config as any).rps ?? 0
          }
        })
        if (estimatedInbound > 0 && estimatedInbound > throughput * 1.2) {
          const secsToSaturate = Math.round(10 / ((estimatedInbound / throughput) - 1))
          issues.push({
            ruleId:          'ADV_WORKER_WILL_SATURATE',
            severity:        'advisory',
            title:           'Worker will saturate quickly',
            message:         `"${node.label}" throughput (${throughput}/s) is below estimated inbound RPS (~${Math.round(estimatedInbound)}/s). Queue depth will grow unbounded — expect saturation within ~${secsToSaturate}s of simulation time.`,
            affectedNodeIds: [id],
          })
        }
      })
      return issues
    },
  },

  {
    id:       'ADV_ALL_ZERO_FAILURE_RATES',
    severity: 'advisory',
    title:    'All failure rates are 0%',
    check(ctx) {
      const allZero = [...ctx.nodes.values()].every(n => {
        const rate = (n.config as any).failureRate
        return rate === undefined || rate === 0
      })
      if (!allZero) return []
      return [{
        ruleId:          'ADV_ALL_ZERO_FAILURE_RATES',
        severity:        'advisory',
        title:           'All failure rates are 0%',
        message:         'No nodes have a failure rate configured. Error rate will always be 0% regardless of load — half the simulation signal is missing. Consider setting small failure rates (0.001–0.01) on key nodes.',
        affectedNodeIds: [],
      }]
    },
  },

  {
    id:       'ADV_CLIENT_HIGH_FAN_OUT',
    severity: 'advisory',
    title:    'Client fans out to many nodes directly',
    check(ctx) {
      const issues: ValidationIssue[] = []
      ctx.nodes.forEach((node, id) => {
        if (node.nodeType !== NodeType.Client) return
        const outgoing = ctx.edges.filter(e => e.sourceId === id).length
        if (outgoing >= 6) {
          issues.push({
            ruleId:          'ADV_CLIENT_HIGH_FAN_OUT',
            severity:        'advisory',
            title:           'Client fans out directly to many nodes',
            message:         `"${node.label}" has ${outgoing} direct outgoing edges. A single client feeding this many nodes simultaneously is unusual — consider whether a Load Balancer or API Gateway should be in between.`,
            affectedNodeIds: [id],
          })
        }
      })
      return issues
    },
  },

  {
    id:       'ADV_NO_STORAGE_IN_TOPOLOGY',
    severity: 'advisory',
    title:    'No persistent storage in topology',
    check(ctx) {
      const storageTypes = new Set([
        NodeType.Database, NodeType.Cache, NodeType.ObjectStore,
        NodeType.VectorDB, NodeType.NoSQLStore, NodeType.GraphDB,
      ])
      const hasStorage = [...ctx.nodes.values()].some(n => storageTypes.has(n.nodeType))
      if (hasStorage) return []
      return [{
        ruleId:          'ADV_NO_STORAGE_IN_TOPOLOGY',
        severity:        'advisory',
        title:           'No storage nodes in topology',
        message:         'The topology models a fully stateless system — no databases, caches or object stores. This is unusual for most real architectures and means storage bottlenecks cannot be observed.',
        affectedNodeIds: [],
      }]
    },
  },

  {
    id:       'ADV_LLM_TPM_TOO_LOW',
    severity: 'advisory',
    title:    'LLM Gateway TPM likely insufficient for connected orchestrators',
    check(ctx) {
      const issues: ValidationIssue[] = []
      ctx.nodes.forEach((node, id) => {
        if (node.nodeType !== NodeType.LLMGateway) return
        const tpm           = (node.config as any).rateLimitTpm ?? Infinity
        const promptTokens  = (node.config as any).avgPromptTokens ?? 0
        const compTokens    = (node.config as any).avgCompletionTokens ?? 0
        const tokensPerReq  = promptTokens + compTokens

        // Find orchestrators pointing at this LLM gateway
        const incomingOrchestrators = ctx.edges
          .filter(e => e.targetId === id)
          .map(e => ctx.nodes.get(e.sourceId))
          .filter(n => n?.nodeType === NodeType.AgentOrchestrator)

        incomingOrchestrators.forEach(orch => {
          if (!orch) return
          const maxAgents  = (orch.config as any).maxConcurrentAgents ?? 1
          const maxSteps   = (orch.config as any).maxSteps ?? 1
          const clientRps  = [...ctx.nodes.values()]
            .filter(n => n.nodeType === NodeType.Client)
            .reduce((s, n) => s + ((n.config as any).rps ?? 0), 0)
          const estimatedTpm = clientRps * maxSteps * tokensPerReq * 60
          if (estimatedTpm > tpm * 0.8) {
            issues.push({
              ruleId:          'ADV_LLM_TPM_TOO_LOW',
              severity:        'advisory',
              title:           'LLM Gateway may be pre-saturated',
              message:         `"${node.label}" rateLimitTpm = ${tpm.toLocaleString()}. Estimated usage from "${orch.label}" at current Client RPS is ~${Math.round(estimatedTpm).toLocaleString()} TPM — already near or above the limit before load ramps up.`,
              affectedNodeIds: [id, orch.id],
            })
          }
        })
      })
      return issues
    },
  },

]

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRY — the single exported list, in evaluation order
// ─────────────────────────────────────────────────────────────────────────────

export const VALIDATION_RULES: ValidationRule[] = [
  ...ERROR_RULES,
  ...WARNING_RULES,
  ...ADVISORY_RULES,
]
