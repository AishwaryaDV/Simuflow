import { makeObservable, observable, action, computed } from 'mobx'
import { nanoid } from 'nanoid'
import type { ActiveScenario, ChaosEvent, ChaosScenarioDef } from '../types/topology'
import { ChaosScenarioId, NodeType } from '../types/topology'
import { graphStore } from './GraphStore'

// ─────────────────────────────────────────────────────────────────────────────
// Scenario catalogue — 53 scenarios across 6 categories
// Reference: docs/chaos-design.md
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_NODES = [NodeType.Database, NodeType.ObjectStore, NodeType.GraphDB, NodeType.NoSQLStore]
const COMPUTE_NODES = [NodeType.ApiServer, NodeType.Microservice, NodeType.Worker, NodeType.AgentOrchestrator, NodeType.LLMGateway]
const DB_NODES      = [NodeType.Database, NodeType.GraphDB, NodeType.NoSQLStore]

export const SCENARIO_CATALOGUE: ChaosScenarioDef[] = [

  // ── Infrastructure Failure ────────────────────────────────────────────────

  {
    id: ChaosScenarioId.InfraAzFailure, name: 'Availability Zone Failure', tag: 'AZ_FAILURE',
    description: 'Kills all nodes in a structural group simulating an AZ going down.',
    category: 'infrastructure', targetKind: 'group',
    validTargetTypes: [], requiresTarget: true,
    configSchema: { type: 'group' },
    rpsMult: 0, latencyAdd: 0, failureRate: 1.0, utilFloor: -1,
  },
  {
    id: ChaosScenarioId.InfraDcOutage, name: 'Data Centre Outage', tag: 'DC_OUTAGE',
    description: 'Takes down an entire group of nodes and their edges simultaneously.',
    category: 'infrastructure', targetKind: 'group',
    validTargetTypes: [], requiresTarget: true,
    configSchema: { type: 'group' },
    rpsMult: 0, latencyAdd: 0, failureRate: 1.0, utilFloor: -1,
  },
  {
    id: ChaosScenarioId.InfraInstanceCrash, name: 'Instance Crash', tag: 'INSTANCE_CRASH',
    description: 'Node dies immediately — all traffic fails until manually resolved.',
    category: 'infrastructure', targetKind: 'node',
    validTargetTypes: [...COMPUTE_NODES, ...STORAGE_NODES, NodeType.Cache, NodeType.CDN, NodeType.WAF, NodeType.Serverless, NodeType.MemoryFabric, NodeType.ToolRegistry],
    requiresTarget: true, configSchema: { type: 'none' },
    rpsMult: 0, latencyAdd: 0, failureRate: 1.0, utilFloor: -1,
  },
  {
    id: ChaosScenarioId.InfraInstanceDegradation, name: 'Instance Slow Degradation', tag: 'DEGRADATION',
    description: 'Gradual capacity loss over time — subtle until it becomes critical.',
    category: 'infrastructure', targetKind: 'node',
    validTargetTypes: [...COMPUTE_NODES, ...STORAGE_NODES, NodeType.Cache],
    requiresTarget: true, configSchema: { type: 'severity' },
    rpsMult: 'varies', latencyAdd: 'varies', failureRate: -1, utilFloor: -1,
  },
  {
    id: ChaosScenarioId.InfraDiskFailure, name: 'Disk Failure', tag: 'DISK_FAILURE',
    description: 'Storage node stops responding — reads and writes fail entirely.',
    category: 'infrastructure', targetKind: 'node',
    validTargetTypes: STORAGE_NODES,
    requiresTarget: true, configSchema: { type: 'none' },
    rpsMult: 0, latencyAdd: 0, failureRate: 1.0, utilFloor: -1,
  },
  {
    id: ChaosScenarioId.InfraDiskCorruption, name: 'Disk Corruption', tag: 'DISK_CORRUPTION',
    description: 'Partial reads succeed but return corrupt data — high error rate.',
    category: 'infrastructure', targetKind: 'node',
    validTargetTypes: STORAGE_NODES,
    requiresTarget: true, configSchema: { type: 'none' },
    rpsMult: 0.5, latencyAdd: 50, failureRate: 0.4, utilFloor: -1,
  },
  {
    id: ChaosScenarioId.InfraIopsThrottle, name: 'Storage IOPS Throttling', tag: 'IOPS_THROTTLE',
    description: 'Disk throughput capped — queries queue and latency balloons.',
    category: 'infrastructure', targetKind: 'node',
    validTargetTypes: [...STORAGE_NODES, NodeType.Cache],
    requiresTarget: true, configSchema: { type: 'percentage', label: 'Cap (% of normal)' },
    rpsMult: 'varies', latencyAdd: 100, failureRate: -1, utilFloor: -1,
  },
  {
    id: ChaosScenarioId.InfraCpuThrottle, name: 'CPU Throttling', tag: 'CPU_THROTTLE',
    description: 'Compute capped by hypervisor — throughput drops, latency climbs.',
    category: 'infrastructure', targetKind: 'node',
    validTargetTypes: COMPUTE_NODES,
    requiresTarget: true, configSchema: { type: 'severity' },
    rpsMult: 'varies', latencyAdd: 'varies', failureRate: -1, utilFloor: 'varies' as any,
  },

  // ── Network Chaos ─────────────────────────────────────────────────────────

  {
    id: ChaosScenarioId.NetPartition, name: 'Network Partition', tag: 'NET_PARTITION',
    description: 'Requests crossing the partition boundary fail silently.',
    category: 'network', targetKind: 'edge',
    validTargetTypes: [], requiresTarget: true,
    configSchema: { type: 'none' },
    rpsMult: 0, latencyAdd: 0, failureRate: 1.0, utilFloor: -1,
  },
  {
    id: ChaosScenarioId.NetCrossRegion, name: 'Cross Region Link Failure', tag: 'CROSS_REGION',
    description: 'Severs a cross-region edge — traffic must reroute or error.',
    category: 'network', targetKind: 'edge',
    validTargetTypes: [], requiresTarget: true,
    configSchema: { type: 'none' },
    rpsMult: 0, latencyAdd: 0, failureRate: 1.0, utilFloor: -1,
  },
  {
    id: ChaosScenarioId.NetPacketLoss, name: 'Packet Loss Injection', tag: 'PACKET_LOSS',
    description: 'A percentage of packets are dropped on the selected edge.',
    category: 'network', targetKind: 'edge',
    validTargetTypes: [], requiresTarget: true,
    configSchema: { type: 'percentage', label: 'Loss %' },
    rpsMult: 'varies', latencyAdd: 0, failureRate: 'varies' as any, utilFloor: -1,
  },
  {
    id: ChaosScenarioId.NetLatency, name: 'High Network Latency Injection', tag: 'HIGH_LATENCY',
    description: 'Adds fixed milliseconds to every request traversing the edge.',
    category: 'network', targetKind: 'edge',
    validTargetTypes: [], requiresTarget: true,
    configSchema: { type: 'milliseconds', label: 'Latency added (ms)' },
    rpsMult: 1, latencyAdd: 'varies', failureRate: -1, utilFloor: -1,
  },
  {
    id: ChaosScenarioId.NetBandwidth, name: 'Bandwidth Throttling', tag: 'BW_THROTTLE',
    description: 'Caps throughput on an edge — queues build upstream.',
    category: 'network', targetKind: 'edge',
    validTargetTypes: [], requiresTarget: true,
    configSchema: { type: 'percentage', label: 'Cap (% of normal)' },
    rpsMult: 'varies', latencyAdd: 20, failureRate: -1, utilFloor: -1,
  },
  {
    id: ChaosScenarioId.NetFlapping, name: 'Connection Flapping', tag: 'FLAPPING',
    description: 'Edge intermittently drops — alternating available and failed states.',
    category: 'network', targetKind: 'edge',
    validTargetTypes: [], requiresTarget: true,
    configSchema: { type: 'none' },
    rpsMult: 'varies', latencyAdd: 0, failureRate: 'varies' as any, utilFloor: -1,
  },
  {
    id: ChaosScenarioId.NetLbFailure, name: 'Load Balancer Failure', tag: 'LB_FAILURE',
    description: 'LB stops routing — all downstream traffic drops.',
    category: 'network', targetKind: 'node',
    validTargetTypes: [NodeType.LoadBalancer],
    requiresTarget: true, configSchema: { type: 'none' },
    rpsMult: 0, latencyAdd: 0, failureRate: 1.0, utilFloor: -1,
  },
  {
    id: ChaosScenarioId.NetTlsCert, name: 'TLS Certificate Expired', tag: 'TLS_CERT',
    description: 'All TLS connections fail — clients see certificate errors.',
    category: 'network', targetKind: 'node',
    validTargetTypes: [NodeType.ApiGateway, NodeType.LLMGateway, NodeType.ExternalService],
    requiresTarget: true, configSchema: { type: 'none' },
    rpsMult: 0, latencyAdd: 0, failureRate: 1.0, utilFloor: -1,
  },
  {
    id: ChaosScenarioId.NetStickySkew, name: 'Sticky Session Skew', tag: 'STICKY_SKEW',
    description: 'LB pins sessions unevenly — one backend saturates while others idle.',
    category: 'network', targetKind: 'node',
    validTargetTypes: [NodeType.LoadBalancer],
    requiresTarget: true, configSchema: { type: 'none' },
    rpsMult: 1, latencyAdd: 0, failureRate: -1, utilFloor: 1.0,
  },
  {
    id: ChaosScenarioId.NetIdleTimeout, name: 'Idle Timeout', tag: 'IDLE_TIMEOUT',
    description: 'Long-lived connections dropped — reconnect storms follow.',
    category: 'network', targetKind: 'node',
    validTargetTypes: [...COMPUTE_NODES, NodeType.ApiGateway, NodeType.LoadBalancer],
    requiresTarget: true, configSchema: { type: 'milliseconds', label: 'Timeout (ms)' },
    rpsMult: 1, latencyAdd: 'varies', failureRate: 0.1, utilFloor: -1,
  },
  {
    id: ChaosScenarioId.NetDnsFailure, name: 'DNS Resolution Failure', tag: 'DNS_FAILURE',
    description: 'DNS stops resolving — all dependent nodes lose routing.',
    category: 'network', targetKind: 'node',
    validTargetTypes: [NodeType.DNS],
    requiresTarget: true, configSchema: { type: 'none' },
    rpsMult: 0, latencyAdd: 0, failureRate: 1.0, utilFloor: -1,
  },
  {
    id: ChaosScenarioId.NetBlackhole, name: 'Routing Blackhole', tag: 'BLACKHOLE',
    description: 'Traffic is silently swallowed — no errors, just disappears.',
    category: 'network', targetKind: 'node',
    validTargetTypes: [NodeType.ApiGateway, NodeType.LoadBalancer],
    requiresTarget: true, configSchema: { type: 'none' },
    rpsMult: 0, latencyAdd: 0, failureRate: 0, utilFloor: -1,
  },
  {
    id: ChaosScenarioId.NetNatFailure, name: 'NAT Gateway Failure', tag: 'NAT_FAILURE',
    description: 'External traffic blocked — inbound and outbound severed.',
    category: 'network', targetKind: 'node',
    validTargetTypes: [NodeType.ApiGateway, NodeType.ExternalService, NodeType.Client],
    requiresTarget: true, configSchema: { type: 'none' },
    rpsMult: 0, latencyAdd: 0, failureRate: 1.0, utilFloor: -1,
  },

  // ── Application Level ─────────────────────────────────────────────────────

  {
    id: ChaosScenarioId.AppMemoryLeak, name: 'Memory Leak', tag: 'MEMORY_LEAK',
    description: 'Gradual memory growth reduces capacity — eventually ends in OOM crash.',
    category: 'application', targetKind: 'node',
    validTargetTypes: [...COMPUTE_NODES],
    requiresTarget: true, configSchema: { type: 'severity' },
    rpsMult: 'varies', latencyAdd: 'varies', failureRate: -1, utilFloor: -1,
  },
  {
    id: ChaosScenarioId.AppOomCrash, name: 'Out of Memory Crash', tag: 'OOM_CRASH',
    description: 'Node exhausts memory and dies immediately.',
    category: 'application', targetKind: 'node',
    validTargetTypes: [...COMPUTE_NODES],
    requiresTarget: true, configSchema: { type: 'none' },
    rpsMult: 0, latencyAdd: 0, failureRate: 1.0, utilFloor: -1,
  },
  {
    id: ChaosScenarioId.AppThreadExhaustion, name: 'Thread Pool Exhaustion', tag: 'THREAD_EXHAUST',
    description: 'All threads occupied — new requests queue indefinitely.',
    category: 'application', targetKind: 'node',
    validTargetTypes: [NodeType.ApiServer, NodeType.Microservice, NodeType.Worker],
    requiresTarget: true, configSchema: { type: 'none' },
    rpsMult: 0, latencyAdd: 0, failureRate: 0.9, utilFloor: 1.0,
  },
  {
    id: ChaosScenarioId.AppDeadlock, name: 'Deadlock Simulation', tag: 'DEADLOCK',
    description: 'Node stops processing — utilisation pins at 100%, no output.',
    category: 'application', targetKind: 'node',
    validTargetTypes: [NodeType.ApiServer, NodeType.Microservice, NodeType.Database],
    requiresTarget: true, configSchema: { type: 'none' },
    rpsMult: 0, latencyAdd: 0, failureRate: 1.0, utilFloor: 1.0,
  },
  {
    id: ChaosScenarioId.AppGcPause, name: 'GC Pause Spike', tag: 'GC_PAUSE',
    description: 'Periodic stop-the-world GC pauses freeze the node at intervals.',
    category: 'application', targetKind: 'node',
    validTargetTypes: [NodeType.ApiServer, NodeType.Microservice, NodeType.Worker],
    requiresTarget: true, configSchema: { type: 'milliseconds', label: 'Pause interval (ms)' },
    rpsMult: 'varies', latencyAdd: 'varies', failureRate: -1, utilFloor: 'varies' as any,
  },
  {
    id: ChaosScenarioId.AppDepTimeout, name: 'Dependency Timeout Increase', tag: 'DEP_TIMEOUT',
    description: 'Downstream timeouts extend — upstream queues fill and cascade.',
    category: 'application', targetKind: 'node',
    validTargetTypes: [NodeType.ApiServer, NodeType.Microservice, NodeType.Worker, NodeType.ApiGateway],
    requiresTarget: true, configSchema: { type: 'multiplier', label: 'Timeout multiplier', options: [2, 5, 10] },
    rpsMult: 0.5, latencyAdd: 'varies', failureRate: 0.3, utilFloor: -1,
  },
  {
    id: ChaosScenarioId.AppLogOverload, name: 'Logging System Overload', tag: 'LOG_OVERLOAD',
    description: 'Observability node saturates — telemetry drops, metrics go blind.',
    category: 'application', targetKind: 'node',
    validTargetTypes: [NodeType.ObservabilityMesh],
    requiresTarget: true, configSchema: { type: 'none' },
    rpsMult: 1, latencyAdd: 0, failureRate: -1, utilFloor: 1.0,
  },

  // ── Traffic Chaos ─────────────────────────────────────────────────────────

  {
    id: ChaosScenarioId.TrafficSpike, name: 'Traffic Spike Surge', tag: 'TRAFFIC_SPIKE',
    description: 'Incoming RPS multiplied — shows which node saturates first.',
    category: 'traffic', targetKind: 'node',
    validTargetTypes: [NodeType.Client],
    requiresTarget: true, configSchema: { type: 'multiplier', label: 'Spike multiplier', options: [2, 5, 10] },
    rpsMult: 'varies', latencyAdd: 0, failureRate: -1, utilFloor: -1,
  },
  {
    id: ChaosScenarioId.TrafficRetryStorm, name: 'Retry Storm', tag: 'RETRY_STORM',
    description: 'Each failed request is retried N times — amplifies load exponentially.',
    category: 'traffic', targetKind: 'node',
    validTargetTypes: [NodeType.Client, NodeType.ApiGateway],
    requiresTarget: true, configSchema: { type: 'multiplier', label: 'Retry multiplier', options: [2, 5, 10] },
    rpsMult: 'varies', latencyAdd: 0, failureRate: -1, utilFloor: -1,
  },
  {
    id: ChaosScenarioId.TrafficBotFlood, name: 'Bot Traffic Flood', tag: 'BOT_FLOOD',
    description: 'High-volume malformed traffic floods the entry point.',
    category: 'traffic', targetKind: 'node',
    validTargetTypes: [NodeType.Client, NodeType.ApiGateway],
    requiresTarget: true, configSchema: { type: 'multiplier', label: 'Flood multiplier', options: [2, 5, 10] },
    rpsMult: 'varies', latencyAdd: 0, failureRate: 0.6, utilFloor: -1,
  },
  {
    id: ChaosScenarioId.TrafficThunderingHerd, name: 'Thundering Herd Event', tag: 'THUNDERING_HERD',
    description: 'Burst of simultaneous requests after a hold — stampedes downstream.',
    category: 'traffic', targetKind: 'node',
    validTargetTypes: [NodeType.Client],
    requiresTarget: true, configSchema: { type: 'multiplier', label: 'Burst size', options: [2, 5, 10] },
    rpsMult: 'varies', latencyAdd: 0, failureRate: -1, utilFloor: -1,
  },
  {
    id: ChaosScenarioId.TrafficPayloadExplosion, name: 'Payload Size Explosion', tag: 'PAYLOAD_BOMB',
    description: 'Oversized payloads strain throughput across all downstream edges.',
    category: 'traffic', targetKind: 'node',
    validTargetTypes: [NodeType.Client, NodeType.ApiGateway],
    requiresTarget: true, configSchema: { type: 'multiplier', label: 'Size multiplier', options: [2, 5, 10] },
    rpsMult: 1, latencyAdd: 30, failureRate: -1, utilFloor: -1,
  },

  // ── Dependency Chaos ──────────────────────────────────────────────────────

  {
    id: ChaosScenarioId.DepThirdParty, name: 'Third Party API Outage', tag: 'THIRD_PARTY_DOWN',
    description: 'External service goes dark — all dependents error immediately.',
    category: 'dependency', targetKind: 'node',
    validTargetTypes: [NodeType.ExternalService],
    requiresTarget: true, configSchema: { type: 'none' },
    rpsMult: 0, latencyAdd: 0, failureRate: 1.0, utilFloor: -1,
  },
  {
    id: ChaosScenarioId.DepAuthOutage, name: 'Authentication Service Outage', tag: 'AUTH_DOWN',
    description: 'Auth fails globally — every request is rejected.',
    category: 'dependency', targetKind: 'node',
    validTargetTypes: [NodeType.ApiGateway, NodeType.LLMGateway],
    requiresTarget: true, configSchema: { type: 'none' },
    rpsMult: 0, latencyAdd: 0, failureRate: 1.0, utilFloor: -1,
  },
  {
    id: ChaosScenarioId.DepServiceDiscovery, name: 'Service Discovery Failure', tag: 'DISCOVERY_FAIL',
    description: "Nodes can't resolve each other — routing collapses.",
    category: 'dependency', targetKind: 'node',
    validTargetTypes: [NodeType.DNS, NodeType.ApiGateway],
    requiresTarget: true, configSchema: { type: 'none' },
    rpsMult: 0, latencyAdd: 0, failureRate: 1.0, utilFloor: -1,
  },
  {
    id: ChaosScenarioId.DepQueueBacklog, name: 'Message Queue Backlog Explosion', tag: 'QUEUE_BACKLOG',
    description: 'Queue fills faster than consumers drain — latency explodes.',
    category: 'dependency', targetKind: 'node',
    validTargetTypes: [NodeType.Queue, NodeType.Stream, NodeType.PubSub],
    requiresTarget: true, configSchema: { type: 'none' },
    rpsMult: 0.1, latencyAdd: 500, failureRate: -1, utilFloor: 1.0,
  },

  // ── Data Layer — Database ─────────────────────────────────────────────────

  {
    id: ChaosScenarioId.DataDbPrimaryCrash, name: 'DB Primary Crash', tag: 'PRIMARY_CRASH',
    description: 'Primary database dies — writes fail, replica promotion race begins.',
    category: 'data', targetKind: 'node',
    validTargetTypes: DB_NODES,
    requiresTarget: true, configSchema: { type: 'none' },
    rpsMult: 0, latencyAdd: 500, failureRate: 1.0, utilFloor: -1,
  },
  {
    id: ChaosScenarioId.DataReplicaFailure, name: 'Replica Failure', tag: 'REPLICA_FAIL',
    description: 'Read replica goes down — all reads reroute to primary, overloading it.',
    category: 'data', targetKind: 'node',
    validTargetTypes: DB_NODES,
    requiresTarget: true, configSchema: { type: 'none' },
    rpsMult: 0.5, latencyAdd: 30, failureRate: 0.2, utilFloor: -1,
  },
  {
    id: ChaosScenarioId.DataReplicationLag, name: 'Replication Lag Spike', tag: 'REPL_LAG',
    description: 'Replica falls behind — reads return stale data, error rate climbs.',
    category: 'data', targetKind: 'node',
    validTargetTypes: DB_NODES,
    requiresTarget: true, configSchema: { type: 'severity' },
    rpsMult: 1, latencyAdd: 'varies', failureRate: 'varies' as any, utilFloor: -1,
  },
  {
    id: ChaosScenarioId.DataSplitBrain, name: 'Split Brain Scenario', tag: 'SPLIT_BRAIN',
    description: 'Two nodes both believe they are primary — conflicting writes corrupt state.',
    category: 'data', targetKind: 'node',
    validTargetTypes: [NodeType.Database, NodeType.GraphDB],
    requiresTarget: true, configSchema: { type: 'none' },
    rpsMult: 1, latencyAdd: 50, failureRate: 0.5, utilFloor: -1,
  },
  {
    id: ChaosScenarioId.DataCorruption, name: 'Data Corruption Injection', tag: 'DATA_CORRUPT',
    description: 'Random records return corrupt data — partial reads succeed.',
    category: 'data', targetKind: 'node',
    validTargetTypes: [...DB_NODES, NodeType.ObjectStore],
    requiresTarget: true, configSchema: { type: 'none' },
    rpsMult: 0.7, latencyAdd: 20, failureRate: 0.3, utilFloor: -1,
  },
  {
    id: ChaosScenarioId.DataHotPartition, name: 'Hot Partition / Sharding Hotspot', tag: 'HOT_PARTITION',
    description: 'One shard receives all traffic — saturates while others idle.',
    category: 'data', targetKind: 'node',
    validTargetTypes: [NodeType.Database, NodeType.NoSQLStore, NodeType.Stream],
    requiresTarget: true, configSchema: { type: 'none' },
    rpsMult: 1, latencyAdd: 200, failureRate: 0.2, utilFloor: 1.0,
  },
  {
    id: ChaosScenarioId.DataConnPool, name: 'Connection Pool Exhaustion', tag: 'CONN_POOL',
    description: 'DB connection pool fills — new queries queue or fail.',
    category: 'data', targetKind: 'node',
    validTargetTypes: DB_NODES,
    requiresTarget: true, configSchema: { type: 'none' },
    rpsMult: 0.1, latencyAdd: 400, failureRate: 0.6, utilFloor: 1.0,
  },
  {
    id: ChaosScenarioId.DataLockContention, name: 'Lock Contention Spike', tag: 'LOCK_CONTENTION',
    description: 'Competing transactions hold locks — throughput collapses.',
    category: 'data', targetKind: 'node',
    validTargetTypes: [NodeType.Database, NodeType.GraphDB],
    requiresTarget: true, configSchema: { type: 'none' },
    rpsMult: 0.2, latencyAdd: 300, failureRate: 0.3, utilFloor: 1.0,
  },
  {
    id: ChaosScenarioId.DataNoisyNeighbour, name: 'Noisy Neighbour Tenant Hijack', tag: 'NOISY_NEIGHBOUR',
    description: 'One tenant consumes disproportionate DB resources — starves others.',
    category: 'data', targetKind: 'node',
    validTargetTypes: [NodeType.Database, NodeType.NoSQLStore],
    requiresTarget: true, configSchema: { type: 'none' },
    rpsMult: 0.4, latencyAdd: 150, failureRate: 0.1, utilFloor: 0.9,
  },

  // ── Data Layer — Cache ────────────────────────────────────────────────────

  {
    id: ChaosScenarioId.DataCachePoisoning, name: 'Cache Poisoning', tag: 'CACHE_POISON',
    description: 'Corrupt entries populate the cache — bad data served at hit rate.',
    category: 'data', targetKind: 'node',
    validTargetTypes: [NodeType.Cache],
    requiresTarget: true, configSchema: { type: 'none' },
    rpsMult: 1, latencyAdd: 0, failureRate: 0.4, utilFloor: -1,
  },
  {
    id: ChaosScenarioId.DataCacheEvictionStorm, name: 'Cache Eviction Storm', tag: 'EVICTION_STORM',
    description: 'Mass eviction sends all traffic to the backing store simultaneously.',
    category: 'data', targetKind: 'node',
    validTargetTypes: [NodeType.Cache],
    requiresTarget: true, configSchema: { type: 'none' },
    rpsMult: 0.1, latencyAdd: 200, failureRate: 0.2, utilFloor: -1,
  },
  {
    id: ChaosScenarioId.DataCacheOom, name: 'Cache OOM Eviction Surge', tag: 'CACHE_OOM',
    description: 'Cache runs out of memory — aggressive evictions destabilize hit rate.',
    category: 'data', targetKind: 'node',
    validTargetTypes: [NodeType.Cache],
    requiresTarget: true, configSchema: { type: 'none' },
    rpsMult: 0.3, latencyAdd: 100, failureRate: 0.15, utilFloor: 1.0,
  },
  {
    id: ChaosScenarioId.DataCachePersistence, name: 'Cache Persistence Failure', tag: 'CACHE_PERSIST',
    description: "Cache can't write to disk — on restart, starts cold with no warm data.",
    category: 'data', targetKind: 'node',
    validTargetTypes: [NodeType.Cache],
    requiresTarget: true, configSchema: { type: 'none' },
    rpsMult: 0, latencyAdd: 300, failureRate: -1, utilFloor: -1,
  },
  {
    id: ChaosScenarioId.DataCacheReplicaDesync, name: 'Cache Replica Desync', tag: 'CACHE_DESYNC',
    description: 'Primary and replica cache diverge — reads return inconsistent results.',
    category: 'data', targetKind: 'node',
    validTargetTypes: [NodeType.Cache],
    requiresTarget: true, configSchema: { type: 'none' },
    rpsMult: 1, latencyAdd: 0, failureRate: 0.25, utilFloor: -1,
  },
  {
    id: ChaosScenarioId.DataCacheClusterPartition, name: 'Cache Cluster Partition', tag: 'CACHE_PARTITION',
    description: 'Cache cluster splits — each partition serves a subset of keys, misses spike.',
    category: 'data', targetKind: 'node',
    validTargetTypes: [NodeType.Cache],
    requiresTarget: true, configSchema: { type: 'none' },
    rpsMult: 0.4, latencyAdd: 80, failureRate: 0.3, utilFloor: -1,
  },
  {
    id: ChaosScenarioId.DataCacheSentinelSplit, name: 'Cache Sentinel Split', tag: 'SENTINEL_SPLIT',
    description: 'Sentinel nodes disagree on primary — failover loops, cache unavailable.',
    category: 'data', targetKind: 'node',
    validTargetTypes: [NodeType.Cache],
    requiresTarget: true, configSchema: { type: 'none' },
    rpsMult: 0, latencyAdd: 0, failureRate: 1.0, utilFloor: -1,
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// ChaosStore
// ─────────────────────────────────────────────────────────────────────────────

export const SCENARIOS_BY_CATEGORY = {
  infrastructure: SCENARIO_CATALOGUE.filter(s => s.category === 'infrastructure'),
  network:        SCENARIO_CATALOGUE.filter(s => s.category === 'network'),
  application:    SCENARIO_CATALOGUE.filter(s => s.category === 'application'),
  traffic:        SCENARIO_CATALOGUE.filter(s => s.category === 'traffic'),
  dependency:     SCENARIO_CATALOGUE.filter(s => s.category === 'dependency'),
  data:           SCENARIO_CATALOGUE.filter(s => s.category === 'data'),
}

class ChaosStore {
  activeScenarios:    Map<string, ActiveScenario> = new Map()
  scenarioLog:        ChaosEvent[]                = []
  availableScenarios: ChaosScenarioDef[]          = SCENARIO_CATALOGUE

  constructor() {
    makeObservable(this, {
      activeScenarios:      observable,
      scenarioLog:          observable,
      availableScenarios:   observable,
      isChaosModeActive:    computed,
      affectedNodeIds:      computed,
      affectedEdgeIds:      computed,
      blastRadius:          computed,
      cascadeSummary:       computed,
      activateScenario:     action,
      deactivateScenario:   action,
      deactivateAllOnNode:  action,
      clearAll:             action,
    })
  }

  // ─── Computed ──────────────────────────────────────────────────────────────

  get isChaosModeActive(): boolean {
    return this.activeScenarios.size > 0
  }

  get affectedNodeIds(): string[] {
    const ids = new Set<string>()
    for (const s of this.activeScenarios.values()) {
      for (const id of s.targetNodeIds) ids.add(id)
    }
    return Array.from(ids)
  }

  get affectedEdgeIds(): string[] {
    const ids = new Set<string>()
    for (const s of this.activeScenarios.values()) {
      for (const id of s.targetEdgeIds) ids.add(id)
    }
    return Array.from(ids)
  }

  /** % of total simulation nodes currently affected by chaos */
  get blastRadius(): number {
    const total = graphStore.nodeCount
    if (total === 0) return 0
    return Math.round((this.affectedNodeIds.length / total) * 100)
  }

  /** Top active scenario for the cascade banner — highest impact first */
  get cascadeSummary(): { name: string; tag: string; mechanism: string; blastRadius: number; impactedCount: number } | null {
    if (!this.isChaosModeActive) return null
    // Priority: failure rate 1.0 first, then by rpsMult ascending (lowest = most impact)
    const sorted = [...this.activeScenarios.values()].sort((a, b) => {
      const defA = SCENARIO_CATALOGUE.find(s => s.id === a.scenarioId)!
      const defB = SCENARIO_CATALOGUE.find(s => s.id === b.scenarioId)!
      const failA = defA.failureRate === 1.0 ? 1 : 0
      const failB = defB.failureRate === 1.0 ? 1 : 0
      return failB - failA
    })
    const top = sorted[0]
    const def = SCENARIO_CATALOGUE.find(s => s.id === top.scenarioId)!
    const mechanism = this._mechanismLabel(def)
    return {
      name:         def.name,
      tag:          def.tag,
      mechanism,
      blastRadius:  this.blastRadius,
      impactedCount: this.affectedNodeIds.length,
    }
  }

  private _mechanismLabel(def: ChaosScenarioDef): string {
    if (def.rpsMult === 0)    return 'complete failure'
    if (def.failureRate >= 0.5) return 'traffic drop'
    if (typeof def.latencyAdd === 'number' && def.latencyAdd >= 200) return 'latency cascade'
    if (def.utilFloor === 1.0) return 'saturation'
    if (def.rpsMult === 'varies') return 'traffic amplification'
    return 'degradation'
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  scenariosForNode(nodeId: string): ActiveScenario[] {
    return [...this.activeScenarios.values()].filter(s => s.targetNodeIds.includes(nodeId))
  }

  scenariosForEdge(edgeId: string): ActiveScenario[] {
    return [...this.activeScenarios.values()].filter(s => s.targetEdgeIds.includes(edgeId))
  }

  validScenariosForNodeType(nodeType: NodeType): ChaosScenarioDef[] {
    return SCENARIO_CATALOGUE.filter(
      s => s.targetKind === 'node' && (s.validTargetTypes.length === 0 || s.validTargetTypes.includes(nodeType))
    )
  }

  // ─── Actions ───────────────────────────────────────────────────────────────

  activateScenario(
    scenarioId:    ChaosScenarioId,
    targetNodeIds: string[]                = [],
    targetEdgeIds: string[]                = [],
    config:        Record<string, unknown> = {},
  ): string {
    const def = SCENARIO_CATALOGUE.find(s => s.id === scenarioId)!
    const severity: 'red' | 'orange' = def.failureRate === 1.0 || def.rpsMult === 0 ? 'red' : 'orange'
    const impactLabel = this._buildImpactLabel(def, config)

    const instance: ActiveScenario = {
      id: nanoid(),
      scenarioId,
      targetNodeIds,
      targetEdgeIds,
      config,
      activatedAt: Date.now(),
      impactLabel,
      severity,
    }
    this.activeScenarios.set(instance.id, instance)
    this._log(scenarioId, 'activated', [...targetNodeIds, ...targetEdgeIds])
    return instance.id
  }

  deactivateScenario(instanceId: string) {
    const s = this.activeScenarios.get(instanceId)
    if (!s) return
    this.activeScenarios.delete(instanceId)
    this._log(s.scenarioId, 'resolved', [...s.targetNodeIds, ...s.targetEdgeIds])
  }

  deactivateAllOnNode(nodeId: string) {
    for (const [id, s] of this.activeScenarios) {
      if (s.targetNodeIds.includes(nodeId)) this.deactivateScenario(id)
    }
  }

  clearAll() {
    for (const id of [...this.activeScenarios.keys()]) {
      this.deactivateScenario(id)
    }
  }

  private _log(scenarioId: ChaosScenarioId, phase: 'activated' | 'resolved', affectedNodeIds: string[]) {
    this.scenarioLog.push({ scenarioId, phase, affectedNodeIds, timestamp: Date.now() })
    if (this.scenarioLog.length > 20) this.scenarioLog.shift()
  }

  private _buildImpactLabel(def: ChaosScenarioDef, config: Record<string, unknown>): string {
    if (def.failureRate === 1.0) return '100% FAILED'
    if (typeof def.failureRate === 'number' && def.failureRate > 0)
      return `${Math.round(def.failureRate * 100)}% DROPPED`
    if (typeof def.latencyAdd === 'number' && def.latencyAdd > 0)
      return `+${def.latencyAdd}ms`
    if (def.configSchema.type === 'percentage' && config.cap)
      return `${config.cap}% CAP`
    if (def.configSchema.type === 'multiplier' && config.multiplier)
      return `${config.multiplier}× LOAD`
    if (def.utilFloor === 1.0) return 'SATURATED'
    return 'ACTIVE'
  }
}

export const chaosStore = new ChaosStore()
