# Chaos System Design

## Overview

53 chaos scenarios across 6 categories. Simulation must be running before any chaos can be injected.
Data Layer category is the 6th and final category.

---

## UI Placement

### Left Sidebar — Components / Chaos tab switch
- The existing NodeLibrary sidebar has a tab toggle at the top: **Components** | **Chaos**
- Chaos tab shows all 53 scenarios grouped by category, each as a **square card** (nodes are rounded/rectangular)
- Each card: icon + scenario name + tag badge
- Hovering a card shows a **one-liner tooltip** with the description
- A **collapse/expand toggle** on the sidebar lets users hide the whole left panel to see the full canvas
- Dragging a chaos card onto the canvas while simulation is **running** → triggers the inject flow (node picker + config inputs if needed)
- Dragging a chaos card onto the canvas while simulation is **idle** → shows a toast: *"Start simulation to inject chaos"*

### Right-click on a node → "Inject chaos"
- Shows only scenarios valid for that node type (filtered from the catalogue)
- Opens an inline popover: node already selected, just fill config + fire

### Right-click on an edge → "Inject chaos"
- Shows only network chaos scenarios (NET_* category)
- Edge already selected as target

### Active scenarios display
- **On the canvas**: affected node shows a purple chaos ring AND an inline overlay pill directly on the node showing: chaos type name + key impact stat (e.g. `NETWORK PARTITION • 23% DROPPED`). Multiple active scenarios on one node stack as multiple pills. Red = severe, orange = moderate.
- **Kill a scenario (primary)**: click the affected node → ConfigPanel shows an "Active Chaos" section at the top with scenario name + × kill button.
- **Kill a scenario (quick)**: right-click the affected node → "Remove chaos"
- **Event log**: lives in MetricsPanel bottom bar as a collapsible strip — timestamped feed of activations and resolutions, last 20 events.

### Cascade banner (MetricsPanel / HUD)
- Live banner showing the worst active cascade: `Top cascade: [name] | Mechanism: [propagation type] | Blast radius: X% | Impacted nodes: N`
- Only visible when chaos is active during simulation
- Same strip pattern as the bottleneck banner already in MetricsPanel

### Bottom toolbar shortcuts
- A row of chaos category icon shortcuts at the bottom of the canvas (alongside the zoom controls) for quick injection without opening the full sidebar
- Icons: one per category — Infrastructure, Network, Application, Traffic, Dependency, Data Layer
- Clicking opens a small popover with just that category's scenarios

---

## Visual Effects When Active

| Target | Effect |
|---|---|
| Node | Purple chaos ring (distinct from health rings green/yellow/red and validation rings) |
| Edge | Dashed red stroke |
| Metrics | Throughput ↓, error rate ↑, latency ↑ — visible immediately in MetricsPanel |

---

## Config Input Types

| Input type | Used for |
|---|---|
| None (one-click fire) | Instance crash, disk failure, OOM crash, LB failure, TLS cert, DNS failure, blackhole, NAT failure, deadlock, thread exhaustion, log overload, third-party outage, auth outage, service discovery, queue backlog, DB primary crash, replica failure, split brain, data corruption, cache poisoning, cache persistence failure, cache sentinel split |
| Severity (mild / moderate / severe) | Instance degradation, CPU throttle, memory leak, GC pause, replication lag |
| Percentage 0–100% | Packet loss, bandwidth cap, IOPS cap |
| Milliseconds | Latency injection, idle timeout, GC pause interval |
| Multiplier (2× / 5× / 10×) | Traffic spike, retry storm, bot flood, payload explosion, dependency timeout |
| Structural group picker | AZ failure, DC outage |
| Duration (optional) | All scenarios with numeric inputs. Blank = active until manually killed |

## Severity → Engine Modifier Mapping

| Severity | Capacity multiplier | Latency add |
|---|---|---|
| Mild | 0.7× | +20ms |
| Moderate | 0.4× | +80ms |
| Severe | 0.1× | +300ms |

---

## Category 1 — Infrastructure Failure (8 scenarios)

| ID | Name | One-liner | Valid Targets | Config | rps mult | latency add | failure rate | util floor |
|---|---|---|---|---|---|---|---|---|
| INFRA_AZ_FAILURE | Availability Zone Failure | Kills all nodes in a structural group simulating an AZ going down | Structural groups | Group picker | 0 | — | 1.0 | — |
| INFRA_DC_OUTAGE | Data Centre Outage | Takes down an entire group of nodes and their edges simultaneously | Structural groups | Group picker | 0 | — | 1.0 | — |
| INFRA_INSTANCE_CRASH | Instance Crash | Node dies immediately — all traffic fails until manually resolved | Any compute/storage node | None | 0 | — | 1.0 | — |
| INFRA_INSTANCE_DEGRADATION | Instance Slow Degradation | Gradual capacity loss over time — subtle until it isn't | Any compute/storage node | Severity | 0.7/0.4/0.1× | +20/80/300ms | — | — |
| INFRA_DISK_FAILURE | Disk Failure | Storage node stops responding — reads and writes fail entirely | Database, ObjectStore, GraphDB, NoSQLStore | None | 0 | — | 1.0 | — |
| INFRA_DISK_CORRUPTION | Disk Corruption | Partial reads succeed but return corrupt data — high error rate | Database, ObjectStore, GraphDB, NoSQLStore | None | 0.5× | +50ms | 0.4 | — |
| INFRA_IOPS_THROTTLE | Storage IOPS Throttling | Disk throughput capped — queries queue and latency balloons | Database, ObjectStore, GraphDB, NoSQLStore, Cache | Cap % | cap applied | +100ms | — | — |
| INFRA_CPU_THROTTLE | CPU Throttling | Compute capped by hypervisor — throughput drops, latency climbs | ApiServer, Microservice, Worker, AgentOrchestrator, LLMGateway | Severity | 0.7/0.4/0.1× | +20/80/300ms | — | 0.7/0.9/1.0 |

---

## Category 2 — Network Chaos (13 scenarios)

| ID | Name | One-liner | Valid Targets | Config | rps mult | latency add | failure rate | util floor |
|---|---|---|---|---|---|---|---|---|
| NET_PARTITION | Network Partition | Requests crossing the partition boundary fail silently | Edges / node pairs | Node pair picker | 0 (crossing) | — | 1.0 | — |
| NET_CROSS_REGION | Cross Region Link Failure | Severs a cross-region edge — traffic must reroute or error | Edges | Edge picker | 0 | — | 1.0 | — |
| NET_PACKET_LOSS | Packet Loss Injection | A percentage of packets are dropped on the selected edge | Edges | Loss % + duration | (1-loss%)× | — | loss% | — |
| NET_LATENCY | High Network Latency Injection | Adds fixed milliseconds to every request traversing the edge | Edges | ms + duration | — | +ms configured | — | — |
| NET_BANDWIDTH | Bandwidth Throttling | Caps throughput on an edge — queues build upstream | Edges | Cap % + duration | cap applied | +20ms | — | — |
| NET_FLAPPING | Connection Flapping | Edge intermittently drops — alternating available and failed | Edges | None | alternates 0/1 | — | alternates | — |
| NET_LB_FAILURE | Load Balancer Failure | LB stops routing — all downstream traffic drops | LoadBalancer | None | 0 | — | 1.0 | — |
| NET_TLS_CERT | TLS Certificate Expired | All TLS connections fail — clients see cert errors | ApiGateway, LLMGateway, ExternalService | None | 0 | — | 1.0 | — |
| NET_STICKY_SKEW | Sticky Session Skew | LB pins sessions unevenly — one backend saturates | LoadBalancer | None | 1× (skewed) | — | — | 1.0 (one backend) |
| NET_IDLE_TIMEOUT | Idle Timeout | Long-lived connections dropped — reconnect storms result | Any node | Timeout ms | 1× | +reconnect ms | 0.1 | — |
| NET_DNS_FAILURE | DNS Resolution Failure | DNS stops resolving — all dependent nodes lose routing | DNS | None | 0 | — | 1.0 | — |
| NET_BLACKHOLE | Routing Blackhole | Traffic is silently swallowed — no errors, just disappears | ApiGateway, LoadBalancer | None | 0 | — | 0 (silent drop) | — |
| NET_NAT_FAILURE | NAT Gateway Failure | External traffic blocked — inbound and outbound severed | ApiGateway, ExternalService, Client | None | 0 | — | 1.0 | — |

---

## Category 3 — Application Level Chaos (7 scenarios)

| ID | Name | One-liner | Valid Targets | Config | rps mult | latency add | failure rate | util floor |
|---|---|---|---|---|---|---|---|---|
| APP_MEMORY_LEAK | Memory Leak | Gradual memory growth reduces capacity — ends in OOM crash | ApiServer, Microservice, Worker, AgentOrchestrator | Severity | -10%/tick | +10ms/tick | — | — |
| APP_OOM_CRASH | Out of Memory Crash | Node exhausts memory and dies immediately | ApiServer, Microservice, Worker, AgentOrchestrator | None | 0 | — | 1.0 | — |
| APP_THREAD_EXHAUSTION | Thread Pool Exhaustion | All threads occupied — new requests queue indefinitely | ApiServer, Microservice, Worker | None | 0 | — | 0.9 | 1.0 |
| APP_DEADLOCK | Deadlock Simulation | Node stops processing — utilisation pins at 100%, no output | ApiServer, Microservice, Database | None | 0 | — | 1.0 | 1.0 |
| APP_GC_PAUSE | GC Pause Spike | Periodic stop-the-world GC freezes the node on interval | ApiServer, Microservice, Worker | Pause ms | periodic dips | +pause ms periodically | — | periodic 1.0 |
| APP_DEP_TIMEOUT | Dependency Timeout Increase | Downstream timeouts extend — upstream queues fill and cascade | ApiServer, Microservice, Worker, ApiGateway | Timeout multiplier | 0.5× | +timeout ms | 0.3 | — |
| APP_LOG_OVERLOAD | Logging System Overload | Observability node saturates — telemetry drops, metrics go blind | ObservabilityMesh | None | — | — | — | 1.0 |

---

## Category 4 — Traffic Chaos (5 scenarios)

| ID | Name | One-liner | Valid Targets | Config | rps mult | latency add | failure rate | util floor |
|---|---|---|---|---|---|---|---|---|
| TRAFFIC_SPIKE | Traffic Spike Surge | Incoming RPS multiplied — shows which node saturates first | Client | Multiplier + duration | N× | — | — | — |
| TRAFFIC_RETRY_STORM | Retry Storm | Each failed request retried N times — amplifies load exponentially | Client, ApiGateway | Retry mult + duration | N× | — | — | — |
| TRAFFIC_BOT_FLOOD | Bot Traffic Flood | High-volume malformed traffic floods entry points | Client, ApiGateway | Multiplier + duration | N× | — | 0.6 | — |
| TRAFFIC_THUNDERING_HERD | Thundering Herd Event | Burst of simultaneous requests after a hold — stampedes downstream | Client | Burst size | burst then normal | — | — | — |
| TRAFFIC_PAYLOAD_EXPLOSION | Payload Size Explosion | Oversized payloads strain throughput across all downstream edges | Client, ApiGateway | Size multiplier | 1× (size → throughput cap) | +30ms | — | — |

---

## Category 5 — Dependency Chaos (4 scenarios)

| ID | Name | One-liner | Valid Targets | Config | rps mult | latency add | failure rate | util floor |
|---|---|---|---|---|---|---|---|---|
| DEP_THIRD_PARTY | Third Party API Outage | External service goes dark — all dependents error immediately | ExternalService | None | 0 | — | 1.0 | — |
| DEP_AUTH_OUTAGE | Authentication Service Outage | Auth fails globally — every request is rejected | ApiGateway, LLMGateway | None | 0 | — | 1.0 | — |
| DEP_SERVICE_DISCOVERY | Service Discovery Failure | Nodes can't resolve each other — routing collapses | DNS, ApiGateway | None | 0 | — | 1.0 | — |
| DEP_QUEUE_BACKLOG | Message Queue Backlog Explosion | Queue fills faster than consumers drain — latency explodes | Queue, Stream, PubSub | None | 0.1× out | +500ms | — | 1.0 |

---

## Category 6 — Data Layer Chaos (16 scenarios)

### Database sub-group (9)

| ID | Name | One-liner | Valid Targets | Config | rps mult | latency add | failure rate | util floor |
|---|---|---|---|---|---|---|---|---|
| DATA_DB_PRIMARY_CRASH | DB Primary Crash | Primary database dies — writes fail, replica promotion race begins | Database, GraphDB, NoSQLStore | None | 0 | +failover ms | 1.0 (writes) | — |
| DATA_REPLICA_FAILURE | Replica Failure | Read replica goes down — all reads reroute to primary, overloading it | Database, GraphDB, NoSQLStore | None | 0.5× reads | +30ms | 0.2 | — |
| DATA_REPLICATION_LAG | Replication Lag Spike | Replica falls behind — reads return stale data, error rate climbs | Database, GraphDB, NoSQLStore | Severity | — | +lag ms | stale read % | — |
| DATA_SPLIT_BRAIN | Split Brain Scenario | Two nodes both believe they are primary — conflicting writes corrupt state | Database, GraphDB | None | 1× | +50ms | 0.5 | — |
| DATA_CORRUPTION | Data Corruption Injection | Random records return corrupt data — partial reads succeed | Database, GraphDB, NoSQLStore, ObjectStore | None | 0.7× | +20ms | 0.3 | — |
| DATA_HOT_PARTITION | Hot Partition / Sharding Hotspot | One shard receives all traffic — saturates while others idle | Database, NoSQLStore, Stream | None | 1× (skewed) | +200ms | 0.2 | 1.0 (one shard) |
| DATA_CONN_POOL | Connection Pool Exhaustion | DB connection pool fills — new queries queue or fail | Database, GraphDB, NoSQLStore | None | 0.1× | +400ms | 0.6 | 1.0 |
| DATA_LOCK_CONTENTION | Lock Contention Spike | Competing transactions hold locks — throughput collapses | Database, GraphDB | None | 0.2× | +300ms | 0.3 | 1.0 |
| DATA_NOISY_NEIGHBOUR | Noisy Neighbour Tenant Hijack | One tenant consumes disproportionate DB resources — starves others | Database, NoSQLStore | None | 0.4× | +150ms | 0.1 | 0.9 |

### Cache sub-group (7)

| ID | Name | One-liner | Valid Targets | Config | rps mult | latency add | failure rate | util floor |
|---|---|---|---|---|---|---|---|---|
| DATA_CACHE_POISONING | Cache Poisoning | Corrupt or malicious entries populate the cache — bad data served | Cache | None | 1× | — | 0.4 (bad data) | — |
| DATA_CACHE_EVICTION_STORM | Cache Eviction Storm | Mass eviction sends all traffic to the backing store simultaneously | Cache | None | 0.1× (cache) | +200ms | 0.2 | — |
| DATA_CACHE_OOM | Cache OOM Eviction Surge | Cache runs out of memory — aggressive evictions destabilize hit rate | Cache | None | 0.3× | +100ms | 0.15 | 1.0 |
| DATA_CACHE_PERSISTENCE | Cache Persistence Failure | Cache can't write to disk — on restart, starts cold with no warm data | Cache | None | 0 (on restart) | +warm-up ms | — | — |
| DATA_CACHE_REPLICA_DESYNC | Cache Replica Desync | Primary and replica cache diverge — reads return inconsistent results | Cache | None | 1× | — | 0.25 (stale) | — |
| DATA_CACHE_CLUSTER_PARTITION | Cache Cluster Partition | Cache cluster splits — each partition serves a subset of keys, misses spike | Cache | None | 0.4× | +80ms | 0.3 | — |
| DATA_CACHE_SENTINEL_SPLIT | Cache Sentinel Split | Sentinel nodes disagree on primary — failover loops, cache unavailable | Cache | None | 0 | — | 1.0 | — |

---

## Node Type → Valid Scenarios (right-click filter reference)

| Node Type | Valid Scenario IDs |
|---|---|
| Client | TRAFFIC_SPIKE, TRAFFIC_RETRY_STORM, TRAFFIC_BOT_FLOOD, TRAFFIC_THUNDERING_HERD, TRAFFIC_PAYLOAD_EXPLOSION, NET_NAT_FAILURE |
| ApiGateway | NET_TLS_CERT, NET_BLACKHOLE, NET_NAT_FAILURE, NET_IDLE_TIMEOUT, APP_DEP_TIMEOUT, DEP_AUTH_OUTAGE, DEP_SERVICE_DISCOVERY, TRAFFIC_RETRY_STORM, TRAFFIC_BOT_FLOOD, TRAFFIC_PAYLOAD_EXPLOSION |
| LoadBalancer | NET_LB_FAILURE, NET_STICKY_SKEW, NET_IDLE_TIMEOUT |
| ApiServer | INFRA_INSTANCE_CRASH, INFRA_INSTANCE_DEGRADATION, INFRA_CPU_THROTTLE, APP_MEMORY_LEAK, APP_OOM_CRASH, APP_THREAD_EXHAUSTION, APP_DEADLOCK, APP_GC_PAUSE, APP_DEP_TIMEOUT |
| Microservice | INFRA_INSTANCE_CRASH, INFRA_INSTANCE_DEGRADATION, INFRA_CPU_THROTTLE, APP_MEMORY_LEAK, APP_OOM_CRASH, APP_THREAD_EXHAUSTION, APP_DEADLOCK, APP_GC_PAUSE, APP_DEP_TIMEOUT |
| Worker | INFRA_INSTANCE_CRASH, INFRA_INSTANCE_DEGRADATION, INFRA_CPU_THROTTLE, APP_MEMORY_LEAK, APP_OOM_CRASH, APP_THREAD_EXHAUSTION, APP_GC_PAUSE, APP_DEP_TIMEOUT |
| Database | INFRA_INSTANCE_CRASH, INFRA_INSTANCE_DEGRADATION, INFRA_DISK_FAILURE, INFRA_DISK_CORRUPTION, INFRA_IOPS_THROTTLE, APP_DEADLOCK, DATA_DB_PRIMARY_CRASH, DATA_REPLICA_FAILURE, DATA_REPLICATION_LAG, DATA_SPLIT_BRAIN, DATA_CORRUPTION, DATA_HOT_PARTITION, DATA_CONN_POOL, DATA_LOCK_CONTENTION, DATA_NOISY_NEIGHBOUR |
| Cache | INFRA_INSTANCE_CRASH, INFRA_IOPS_THROTTLE, DATA_CACHE_POISONING, DATA_CACHE_EVICTION_STORM, DATA_CACHE_OOM, DATA_CACHE_PERSISTENCE, DATA_CACHE_REPLICA_DESYNC, DATA_CACHE_CLUSTER_PARTITION, DATA_CACHE_SENTINEL_SPLIT |
| ObjectStore | INFRA_DISK_FAILURE, INFRA_DISK_CORRUPTION, INFRA_IOPS_THROTTLE, DATA_CORRUPTION |
| GraphDB | INFRA_DISK_FAILURE, INFRA_DISK_CORRUPTION, INFRA_IOPS_THROTTLE, INFRA_INSTANCE_CRASH, APP_DEADLOCK, DATA_DB_PRIMARY_CRASH, DATA_REPLICA_FAILURE, DATA_REPLICATION_LAG, DATA_SPLIT_BRAIN, DATA_CORRUPTION, DATA_CONN_POOL, DATA_LOCK_CONTENTION |
| NoSQLStore | INFRA_DISK_FAILURE, INFRA_DISK_CORRUPTION, INFRA_IOPS_THROTTLE, INFRA_INSTANCE_CRASH, DATA_DB_PRIMARY_CRASH, DATA_REPLICA_FAILURE, DATA_REPLICATION_LAG, DATA_CORRUPTION, DATA_HOT_PARTITION, DATA_CONN_POOL, DATA_NOISY_NEIGHBOUR |
| VectorDB | INFRA_INSTANCE_CRASH, INFRA_IOPS_THROTTLE |
| Queue | DEP_QUEUE_BACKLOG, INFRA_INSTANCE_CRASH |
| Stream | DEP_QUEUE_BACKLOG, INFRA_INSTANCE_CRASH, DATA_HOT_PARTITION |
| PubSub | DEP_QUEUE_BACKLOG |
| DNS | NET_DNS_FAILURE, DEP_SERVICE_DISCOVERY |
| ExternalService | DEP_THIRD_PARTY, NET_TLS_CERT, NET_NAT_FAILURE |
| LLMGateway | INFRA_CPU_THROTTLE, NET_TLS_CERT, DEP_AUTH_OUTAGE, APP_DEP_TIMEOUT |
| AgentOrchestrator | INFRA_INSTANCE_CRASH, INFRA_CPU_THROTTLE, APP_MEMORY_LEAK, APP_OOM_CRASH |
| ObservabilityMesh | APP_LOG_OVERLOAD |
| CDN | INFRA_INSTANCE_CRASH |
| WAF | INFRA_INSTANCE_CRASH |
| Serverless | INFRA_INSTANCE_CRASH, INFRA_CPU_THROTTLE |
| MemoryFabric | INFRA_INSTANCE_CRASH, INFRA_IOPS_THROTTLE |
| ToolRegistry | INFRA_INSTANCE_CRASH, INFRA_CPU_THROTTLE |
| Structural groups | INFRA_AZ_FAILURE, INFRA_DC_OUTAGE |
| Edges (any) | NET_PARTITION, NET_CROSS_REGION, NET_PACKET_LOSS, NET_LATENCY, NET_BANDWIDTH, NET_FLAPPING |

---

## Build Order

### Phase 1 — Data model
1. `topology.ts` — add all 53 ChaosScenarioId enum values + update ActiveScenario/ChaosEvent types to carry impact stats
2. `ChaosStore.ts` — replace 6-scenario catalogue with all 53 scenarios grouped by category, add computed blastRadius + impactedNodeIds + cascadeSummary

### Phase 2 — Sidebar UI
3. `NodeLibrary.tsx` — Components / Chaos tab toggle at top, chaos items as square cards grouped by category, one-liner hover tooltip, sidebar collapse/expand toggle icon
4. `Toast.tsx` — simple bottom-centre toast component (reusable, auto-dismisses after 3s)
5. `CanvasPanel.tsx` — wire drag-from-chaos-tab: if sim running → open inject config popover, if idle → fire toast "Start simulation to inject chaos"

### Phase 3 — Context menus
6. Right-click on node → "Inject chaos" popover — scenarios filtered to that node's valid types, node pre-selected, config inputs inline, Fire button
7. Right-click on node with active chaos → "Remove chaos" option (if multiple active on that node, show a picker)
8. Right-click on edge → "Inject chaos" popover — network chaos scenarios only (NET_* IDs), edge pre-selected

### Phase 4 — Engine effects
9. `constraintSolver.ts` — read chaosStore.activeScenarios each tick, apply rps multiplier / latency add / failure rate override / utilisation floor per scenario ID as per the engine effect table
10. `CustomNode.tsx` — purple chaos ring on affected nodes (layered above health ring, below selected shadow)
11. Edge rendering in `CanvasPanel.tsx` — dashed red stroke on edges targeted by NET_* chaos scenarios

### Phase 5 — Active state UI
12. `CustomNode.tsx` — inline chaos pill overlay on node: severity-coded (red = severe/crash, orange = moderate/degraded), shows scenario tag + key impact stat, stacks vertically if multiple active
13. `ConfigPanel.tsx` — "Active Chaos" section at top when selected node has active chaos: scenario name + impact stat + × kill button per scenario
14. `MetricsPanel.tsx` — cascade banner strip: `Top cascade: [name] | Mechanism: [type] | Blast radius: X% | Impacted: N nodes` — visible only when chaos is active
15. `MetricsPanel.tsx` — chaos event log strip: collapsible, timestamped activations and resolutions, last 20 events
16. `CanvasPanel.tsx` — bottom toolbar chaos category shortcuts: 6 icons (one per category), clicking opens a small popover listing that category's scenarios with a one-liner and Fire button
