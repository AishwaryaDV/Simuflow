# SimuFlow Frontend Documentation

> Reference document for architecture, topology, and build phases.
> Companion to `SimuFlow_Frontend.pdf` and `STACK_DECISIONS.md`.

---

## Stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | React 19 + TypeScript | |
| Build | Vite 8 | Web Worker support via `import.meta.url` |
| State | MobX 6 | All 4 stores — no Zustand (see STACK_DECISIONS.md) |
| Canvas | `@xyflow/react` v12 | Rebranded from `reactflow` v11, React 19 compatible |
| Styling | Tailwind CSS v3 | PostCSS + Autoprefixer |
| Animation | Framer Motion 12 | Particle edges |
| Charts | Recharts 3 | Metrics sparklines |
| Auth/DB | Supabase JS 2 | Wired in Phase 5 |

---

## Directory Topology

```
frontend/src/
├── types/
│   └── topology.ts              # Shared type contract (frontend ↔ worker ↔ backend)
│
├── stores/
│   ├── index.ts                 # Barrel export
│   ├── GraphStore.ts            # Canvas structure: nodes, edges, structural nodes
│   ├── SimulationStore.ts       # Runtime state: node health, edge flows, metrics
│   ├── ChaosStore.ts            # Chaos scenarios: catalogue, active, event log
│   └── UIStore.ts               # Panel visibility, modals, canvas mode, theme
│
├── hooks/
│   ├── useWorkerBridge.ts       # Spawns simulation.worker.ts, wires message I/O
│   └── useLocalStoragePersistence.ts  # Rehydrate/auto-save topology
│
├── workers/
│   └── simulation.worker.ts    # Off-main-thread engine: tick loop, node transfer fns
│
├── components/
│   ├── layout/
│   │   └── WorkspaceLayout.tsx  # 5-zone shell, mounts both hooks
│   │
│   ├── canvas/
│   │   ├── CanvasPanel.tsx      # ReactFlow instance
│   │   ├── CustomNode.tsx       # Sim node: health ring, metrics badge
│   │   ├── StructuralNodeComponent.tsx  # Dashed-border container node
│   │   ├── ParticleEdge.tsx     # Animated edge with flowing particles
│   │   ├── CanvasToolbar.tsx    # Mode switcher (select/hand/connect/text/eraser/container)
│   │   ├── nodeTypes.ts         # NodeType → component registry
│   │   ├── edgeTypes.ts         # Edge kind → component registry
│   │   └── nodeConfig.ts        # Labels, icons, colors per NodeType
│   │
│   ├── library/
│   │   └── NodeLibrary.tsx      # Draggable palette: 19 sim + 13 structural types
│   │
│   └── panels/
│       ├── Toolbar.tsx          # Top bar: simulate controls, speed, menus
│       └── ConfigPanel.tsx      # Right sidebar: selected node config form
│
└── presets/
    ├── web_app.json
    ├── microservices.json
    ├── queue_system.json
    └── cached_web_app.json
```

---

## Node Types

### Simulation Nodes (19) — engine processes these

**Original 8:**
`Client`, `LoadBalancer`, `ApiServer`, `Cache`, `Database`, `Queue`, `CDN`, `Microservice`

**Added in v2.0 (11):**

| Node | Key simulation behaviour |
|---|---|
| ApiGateway | Per-client rate limiting + auth overhead latency |
| Serverless | Cold start penalty, instant scale, concurrency limit |
| Worker | Async pull-based consumer, job throughput not RPS |
| PubSub | Fan-out to N subscribers (vs Queue's point-to-point) |
| Stream | Ordered, partitioned, replayable — Kafka model |
| RateLimiter | Token bucket / sliding window, drop vs queue on overflow |
| ObjectStore | MB/s throughput model, no transactions — S3 model |
| ExternalService | Third-party dependency, p50/p99 spread, uncontrollable failure |
| LLMGateway | Token-driven latency, TPM rate limits, streaming |
| VectorDB | ANN queries, compute scales with index size + dimensions |
| AgentOrchestrator | Multi-step fan-out, coordination overhead, step budget |

### Structural Nodes (13) — visual only, engine ignores

`VPC`, `Subnet`, `AvailabilityZone`, `Region`, `SecurityGroup`, `ServiceMesh`,
`Firewall`, `NATGateway`, `ToolRegistry`, `MemoryFabric`, `ShardAnnotation`,
`ReplicaAnnotation`, `TextLabel`

---

## Store Summary

### GraphStore
Canvas model. Persisted to localStorage via `useLocalStoragePersistence`.

| Observable | Type | Purpose |
|---|---|---|
| `nodes` | `Map<string, SimNode>` | Simulation nodes + configs |
| `edges` | `Map<string, SimEdge>` | Directed edges |
| `structuralNodes` | `Map<string, StructuralNode>` | Containers (not simulated) |
| `selectedNodeId` | `string \| null` | Opens ConfigPanel |
| `diagramName` | `string` | User-facing title |
| `isDirty` | `boolean` | Unsaved changes flag |
| `viewport` | `{x,y,zoom}` | Canvas camera |

Key computed: `topology` (returns `TopologySchema`), `sourceNodes`, `terminalNodes`.

### SimulationStore
Runtime state. Updated every 200ms via worker `FRAME` messages.

| Observable | Type | Purpose |
|---|---|---|
| `status` | `SimulationStatus` | idle/running/paused/chaos |
| `nodeStates` | `Map<string, NodeRuntimeState>` | Health, utilization, error rates |
| `edgeFlows` | `Map<string, EdgeFlowState>` | Particles, throughput, errors |
| `globalMetrics` | `GlobalMetrics` | p50/p95/p99, throughput, error rate |
| `metricsHistory` | `MetricsSnapshot[]` | Rolling 60s, max 600 snapshots |
| `speed` | `0.25 \| 0.5 \| 1 \| 2 \| 4` | Sim speed multiplier |

Key computed: `bottleneckNodes`, `systemHealthScore`, `isRunning`.

### ChaosStore
Chaos engine state.

| Observable | Purpose |
|---|---|
| `activeScenarios` | Currently running chaos events |
| `scenarioLog` | Activation/escalation/resolution history (max 20) |
| `availableScenarios` | Static catalogue of 6 scenario types |

Scenarios: `DbFailover`, `CacheStampede`, `NetPartition`, `TrafficSpike`, `Cascade`, `SlowDependency`

### UIStore
UI-only state — panel visibility, modals, canvas mode, theme.

---

## Worker Message Protocol

**Main → Worker (`WorkerInboundMessage`):**
`START`, `PAUSE`, `RESUME`, `STOP`, `SET_SPEED`, `UPDATE_TOPOLOGY`, `ACTIVATE_CHAOS`, `DEACTIVATE_CHAOS`

**Worker → Main:**
`FRAME` — posts `SimulationFrame` every 200ms containing node states, edge flows, global metrics, bottleneck list.

`useWorkerBridge` is the **only** path that touches the Worker directly. SimulationStore actions go through `_bridge` (injected by the hook).

---

## Preset Categories

Three categories, four presets:

| File | Category | Topology |
|---|---|---|
| `web_app.json` | fundamentals | Client → LB → 2× API → DB |
| `cached_web_app.json` | fundamentals | LB → Cache → DB |
| `microservices.json` | patterns | Multiple independent services |
| `queue_system.json` | patterns | Queue-based async architecture |

AI-architecture preset category (`"ai"`) is reserved for Phase 3+.

---

## Topology Schema Version

`TOPOLOGY_VERSION = "2.0"` — breaking change from v1.0.

- `NodeConfig` discriminated union expanded to 19 types
- `TopologySchema` now includes `structuralNodes: StructuralNode[]`
- v1.0 JSON (presets) auto-migrates on load (empty `structuralNodes` array injected)

---

## Build Phases

### Phase 0 — Laying the groundwork ✅

Before touching any UI, we set up everything else depends on. The shared type file (`topology.ts`) that defines every node, edge, and data shape in the entire app. The four state stores that components will read from and write to. And the basic routing so the app knows what to show at which URL. None of this is visible — it's just making sure we're never building on sand.

**Deliverables:**
- `src/types/topology.ts` — full type contract
- Stub `GraphStore`, `SimulationStore`, `ChaosStore`, `UIStore` (MobX)
- `App.tsx` + React Router (workspace + shared view routes)

---

### Phase 1 — The canvas and drawing experience ✅

This is where SimuFlow starts looking like something. You get the full workspace layout on screen — toolbar across the top, sidebar on the left, canvas in the middle, config panel on the right. You can drag any of the 8 node types (Client, Load Balancer, API Server, Cache, Database, Queue, CDN, Microservice) from the sidebar onto the canvas, connect them with edges, click a node to open its config panel and adjust its properties. No simulation running yet — just the drawing experience. This phase answers the question: does the canvas feel right? Is the layout working? Is configuring a node intuitive? We also wire up localStorage here so nothing gets lost between sessions, and load the 4 preset blueprints so you can instantly put a real architecture on the canvas for testing.

**Deliverables:**
- `WorkspaceLayout` — 5-zone shell (toolbar + left + canvas + right + bottom)
- `NodeLibrary` sidebar — node type cards, draggable onto canvas
- `CanvasPanel` — ReactFlow with all custom node types, snap-to-grid, handles, delete key
- `GraphStore` fully wired — `addNode`, `removeNode`, `updateNodeConfig`, `connectNodes`
- `ConfigPanel` — opens on node click, typed sliders/inputs per node type
- `ParticleEdge` idle state — base SVG path only, no particles yet
- localStorage persistence on `GraphStore`
- Preset JSON files + `loadPreset()` + preset cards in NodeLibrary

---

### Phase 2 — The simulation comes alive ✅

This is the most important phase. We build the Web Worker — a background process that runs the simulation completely separately from the UI so it never slows down the canvas. The worker generates traffic, routes requests through the topology you've drawn, and sends back a snapshot of what's happening every 200ms. We hook that up to the app state so the canvas can react to it. Then we make the edges come alive — animated particles flowing along each connection representing requests moving through the system. The toolbar play/pause/stop controls go in. At the end of this phase, the product exists — you can draw a system and watch it run.

**Deliverables:**
- `simulation.worker.ts` — full engine: all 19 node types with individual transfer functions (capacity, hit rate, queue depth, cold starts, token budgets, etc.), posts `SimulationFrame` every 200ms. Request generation and graph traversal logic is embedded directly in the worker (no separate engine files needed).
- `useWorkerBridge` hook — only path that touches the Worker; routes `FRAME` messages into `simulationStore.absorbFrame()`; exposes start/pause/resume/stop/setSpeed
- `SimulationStore` — fully wired to the bridge; all actions talk to the worker; `absorbFrame()` in `runInAction` batch
- Toolbar simulate controls — Simulate button (turns purple → Pause while running), Stop button resets; elapsed timer (MM:SS) with pulsing green dot; speed selector (0.25× → 4×)
- `ParticleEdge` goes live — SVG `animateMotion` particles, purple dots proportional to throughput, turns red when error rate is high

**Still to add in Phase 3:** dedicated floating HUD card on canvas showing live RPS, total requests, and speed readout.

---

### Phase 3 — Making the simulation readable

Right now particles are moving but nodes don't react yet. This phase makes nodes tell the story. We add the constraint logic — nodes can saturate, fail, queue up requests, add latency. Nodes grow a health ring that turns green when healthy, yellow when under pressure, red when overwhelmed or failing. The metrics panel opens at the bottom showing live throughput, latency percentiles, and error rate as scrolling charts. A bottleneck banner appears when any node hits critical load. Now you can look at the canvas and immediately read the health of the whole system without looking at any numbers.

**Deliverables:**
- `engine/constraintSolver.ts` — capacity, latency sampling, failure rate, queue overflow
- `engine/metricAggregator.ts` — rolling 5s window, p50/p95/p99
- `engine/particleEmitter.ts` — particle count + velocity from throughput
- Health ring on `CustomNode` — green/yellow/red/grey, CSS variable-driven pulse
- `MetricsPanel` — throughput, latency percentiles, error rate, recharts sparklines, bottleneck banner
- SimulationHUD floating card on canvas — live RPS, elapsed, total requests, speed
- Real-time cost estimation panel — rate/spent/SIM/budget (rate display is required)

---

### Phase 4 — Chaos

The simulation is running smoothly. Now we break things intentionally. We add all 6 named chaos scenarios — Database Failover, Cache Stampede, Network Partition, Traffic Spike, Cascading Failure, Slow Dependency. Each one has a distinct visual on the canvas when active (partitioned edges go dashed with a red X, cascade failure turns nodes red outward from the target, etc.). The chaos panel opens from the right sidebar where you can activate scenarios, see what's currently running, and read a log of events. Build and test each scenario one at a time — they're independent enough that one broken scenario doesn't affect the others.

**Deliverables:**
- `ChaosStore` fully wired
- `chaos/chaosModifier.ts`
- 6 scenario files — one at a time, test each independently
- `ChaosPanel` UI — catalogue cards, active scenarios, event log, target selector
- Canvas visual states — partitioned edges (dashed + X), bottleneck highlight, cascade red travel

---

### Phase 5 — Polish + Backend

Everything that makes it feel finished. Onboarding for first-time users, tooltips explaining what each node and setting does, performance checks to make sure the canvas stays smooth at 60fps even under heavy load. Then the backend — a thin FastAPI server that handles user accounts, saves diagrams to a database, and generates shareable read-only links. We wire Supabase auth into the frontend, replace the localStorage save with real cloud persistence, and add the share/fork flow. End-to-end tests. Done.

**Deliverables:**
- `ShareModal` (frontend shell, no real backend yet)
- Onboarding, tooltips, responsive layout
- Performance audit — `observer()` placement, particle pool, `runInAction` correctness
- Backend — FastAPI scaffold → auth → migrations → diagram CRUD → share/fork → presets
- Wire Supabase auth into frontend, replace localStorage with real persistence
- E2E tests (Playwright)
