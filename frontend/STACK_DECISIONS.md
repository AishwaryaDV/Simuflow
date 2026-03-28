# Frontend Stack Decisions
Amendments to SimuFlow_Frontend.pdf — agreed during initial setup.

## State Management
**Decision:** MobX only. No Zustand.

The frontend doc specified Zustand for UI-only state (panels, modals, theme) and MobX for
simulation/graph state. This separation adds a second library, a second mental model, and
bundle overhead for no technical benefit. UIStore is a plain MobX observable class instead.

All four stores (GraphStore, SimulationStore, ChaosStore, UIStore) use MobX.

## Canvas Engine
**Decision:** `@xyflow/react` v12 (not `reactflow` v11 as stated in the doc).

The library was rebranded — `reactflow` → `@xyflow/react` at v12. The v11 package does not
support React 19. `@xyflow/react` v12 supports React 18+ and is the current maintained
package by the same authors.

## Tailwind CSS
**Decision:** Tailwind v3 (not v4).

The doc specifies Tailwind ^3. v4 uses a completely different config model (no
`tailwind.config.js`, different plugin setup). v3 is installed as a devDependency with
PostCSS and Autoprefixer, configured via `tailwind.config.js` and `postcss.config.js`.

## Node Type Expansion (topology v2.0)
**Decision:** 19 simulation nodes + structural layer (replaces original 8 simulation nodes only).

### Design philosophy
SimuFlow's edge over tools like Paperdraw is that every node behaves differently in simulation.
Rather than adding 50+ cosmetically different boxes, we add only nodes with meaningfully distinct
simulation models, and introduce a separate structural layer for visual/infrastructure components
that the engine ignores.

### Two layers on one canvas
- **Simulation nodes** — have capacity, latency, failure rate, health rings, receive particles.
- **Structural nodes** — dashed-border containers (VPC, Subnet, AZ, etc.). Engine skips them entirely.

### 11 new simulation nodes (added to original 8)
| Node | Key distinction |
|---|---|
| API Gateway | Per-client rate limiting + auth overhead latency |
| Serverless | Cold start penalty, instant scale, concurrency limit |
| Worker | Async pull-based consumer, job throughput not RPS |
| Pub/Sub | Fan-out to N subscribers vs Queue's point-to-point |
| Stream | Ordered, partitioned, replayable — Kafka model |
| Rate Limiter | Token bucket / sliding window, drop vs queue behavior |
| Object Store | MB/s throughput model, no transactions — S3 model |
| External Service | Third-party dependency, p50/p99 spread, uncontrollable failure |
| LLM Gateway | Token-driven latency, TPM rate limits, streaming |
| Vector DB | ANN queries, compute scales with index size + dimensions |
| Agent Orchestrator | Multi-step fan-out, coordination overhead, step budget |

### 12 structural container types
VPC, Subnet, AvailabilityZone, Region, SecurityGroup, ServiceMesh,
Firewall, NATGateway, ToolRegistry, MemoryFabric, ShardAnnotation, ReplicaAnnotation

### Preset category
Added `"ai"` as a third preset category alongside `"fundamentals"` and `"patterns"`.

### TOPOLOGY_VERSION
Bumped `"1.0"` → `"2.0"`. Breaking change: NodeConfig union expanded, TopologySchema now
includes `structuralNodes: StructuralNode[]`.
