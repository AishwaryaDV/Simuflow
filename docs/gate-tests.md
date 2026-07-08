# SimuFlow — Pre-Launch Gate Tests

**Purpose:** Run every section below before deploying. Each test has exact steps and a
pass/fail expected result. Mark each cell as you go. If any GATE test fails, do not deploy
until fixed. VERIFY tests are important but won't block launch.

**Setup:** Run the frontend dev server (`npm run dev`) and have the backend running locally
or pointed at staging. Open Chrome DevTools Console to catch silent errors.

---

## Gate 1 — App Boot & Error Resilience

| # | Priority | Steps | Expected | Pass? |
|---|---|---|---|---|
| 1.1 | GATE | Open the app in a fresh browser (clear localStorage) | App loads, canvas visible, no console errors, title says "SimuFlow" | |
| 1.2 | GATE | Open DevTools Console, navigate around all panels | Zero uncaught errors or warnings (MobX strict-mode, React key warnings, etc.) | |
| 1.3 | GATE | Refresh the page with an empty canvas | App loads cleanly, no crash, no stale data | |
| 1.4 | VERIFY | Open the app in Firefox and Safari | Renders correctly, no layout breaks | |
| 1.5 | GATE | Trigger a component error (e.g. corrupt localStorage `simuflow:topology` to `{invalid}`, reload) | ErrorBoundary catches it — fallback UI with "Try again" / "Reload app" buttons, not a white screen | |
| 1.6 | VERIFY | Click "Try again" on the error boundary | Component re-renders without full page reload | |
| 1.7 | VERIFY | Click "Reload app" on the error boundary | Full page reload | |

---

## Gate 2 — Authentication

| # | Priority | Steps | Expected | Pass? |
|---|---|---|---|---|
| 2.1 | GATE | Land on the app without signing in | Canvas fully usable — drag nodes, connect, simulate. No auth wall | |
| 2.2 | GATE | Click "Save" without signing in | Auth modal opens (not a crash or silent failure) | |
| 2.3 | GATE | Click "My Diagrams" without signing in | Auth modal opens | |
| 2.4 | GATE | Click Share button without saving first | Button is disabled, tooltip says "Save your diagram first to share it" | |
| 2.5 | GATE | Sign up with email | Confirmation email arrives, green info message shown in modal | |
| 2.6 | GATE | Sign in with email (after confirming) | Modal closes, avatar circle appears in toolbar with initial | |
| 2.7 | GATE | Sign in with Google OAuth | Redirects to Google, returns to the same page (not just `/`), avatar shown | |
| 2.8 | GATE | Click avatar dropdown → Sign out | Avatar reverts to "Sign in" button, dropdown closes | |
| 2.9 | VERIFY | Sign in → close tab → reopen app | Still signed in (Supabase session persists) | |
| 2.10 | VERIFY | Click backdrop of auth modal | Modal closes, no pending action fires | |
| 2.11 | GATE | Click Save (not signed in) → sign in via modal | After sign-in, the save action resumes automatically (pending action) | |
| 2.12 | GATE | Click My Diagrams (not signed in) → sign in → modal resumes | Diagram list opens after sign-in | |
| 2.13 | VERIFY | Click avatar dropdown → click outside the dropdown | Dropdown closes (outside-click listener) | |
| 2.14 | GATE | Sign in from `/shared/:token` page via Google | Redirects back to `/shared/:token` (not `/`) | |

---

## Gate 3 — Node Library & Canvas

| # | Priority | Steps | Expected | Pass? |
|---|---|---|---|---|
| 3.1 | GATE | Open the node library sidebar (left panel) | All 26 node types visible across 6 categories: Traffic & Edge (7), Compute (5), Storage (6), Messaging (3), AI & Agents (4), External (1) | |
| 3.2 | GATE | Drag a Client node onto canvas | Node appears at drop position, "Save" button becomes enabled (isDirty) | |
| 3.3 | GATE | Drag the same node type twice | Both render with unique IDs and separate positions | |
| 3.4 | GATE | Click a node on canvas | Config panel opens on the right side showing node label + all config fields | |
| 3.5 | GATE | Edit the node label in config panel | Label updates on the canvas node in real time | |
| 3.6 | GATE | Edit a numeric config (e.g. capacity, set to 5000) | Value sticks after clicking away. Start sim → node uses the new value | |
| 3.7 | GATE | Set a numeric field above its max (e.g. LB replicas > 32) | Value clamps to max on blur | |
| 3.8 | GATE | Set a numeric field below its min (e.g. capacity to -1) | Value clamps to min (0 or 1) on blur | |
| 3.9 | GATE | Connect two nodes by dragging from source handle to target handle | Edge appears between nodes | |
| 3.10 | GATE | Try to connect a node to itself | No self-loop created | |
| 3.11 | GATE | Select a node → press Delete/Backspace | Node is removed, its connected edges are also removed | |
| 3.12 | GATE | Click an edge on canvas | Edge config panel opens on the right | |
| 3.13 | GATE | Select an edge → press Delete/Backspace | Only the edge is removed, both nodes remain | |
| 3.14 | VERIFY | Pan canvas (middle-click drag or trackpad) | Viewport moves smoothly | |
| 3.15 | VERIFY | Zoom canvas (scroll wheel or pinch) | Viewport scales smoothly | |
| 3.16 | GATE | Drag a node to reposition → release | Node stays at new position. One undo step created (not per-pixel) | |
| 3.17 | VERIFY | Add 30+ nodes to canvas | Canvas still responsive, no layout freeze or memory spike | |

**Node types to spot-check (drag onto canvas, verify config panel renders correctly):**

| # | Node | Key Config Fields |
|---|---|---|
| 3.N1 | Client | rps, burstMultiplier |
| 3.N2 | Load Balancer | capacity, replicas, algorithm |
| 3.N3 | API Server | capacity, latencyMs, failureRate |
| 3.N4 | Cache (Redis) | capacity, hitRate, latencyMs |
| 3.N5 | Database | capacity, latencyMs, failureRate |
| 3.N6 | Queue | capacity, latencyMs |
| 3.N7 | CDN | capacity, hitRate |
| 3.N8 | WAF | inspectionCapacity, blockRate, failureRate |
| 3.N9 | LLM Gateway | capacity, latencyMs, tokensPerReq |
| 3.N10 | Vector DB | capacity, latencyMs, dimensions |
| 3.N11 | Agent Orchestrator | capacity, latencyMs, maxSteps |

---

## Gate 4 — Undo / Redo

| # | Priority | Steps | Expected | Pass? |
|---|---|---|---|---|
| 4.1 | GATE | Add a node → press Cmd/Ctrl+Z | Node disappears from canvas. Undo button in toolbar greys out if stack is empty | |
| 4.2 | GATE | After undoing (4.1) → press Cmd/Ctrl+Shift+Z | Node reappears at its original position | |
| 4.3 | GATE | Add 3 nodes → undo 3 times | Canvas is empty after 3 undos | |
| 4.4 | GATE | Delete a node that has 2 edges → undo | Node AND both edges are restored | |
| 4.5 | GATE | Connect two nodes → undo | Edge removed, both nodes remain | |
| 4.6 | GATE | Change a node's capacity from 1000 to 5000 → undo | Capacity reverts to 1000, visible in config panel | |
| 4.7 | GATE | Type "500" quickly into a capacity field (3 keystrokes) → undo once | Reverts to the value before you started typing (not to "50") — rapid edits batch | |
| 4.8 | GATE | Drag a slider (e.g. failureRate) from 0 to 0.5 → undo once | Reverts to 0 (the full drag is one undo step) | |
| 4.9 | GATE | Undo when stack is empty (fresh canvas, nothing done) | Nothing happens, no crash, no console error | |
| 4.10 | GATE | Redo when redo stack is empty | Nothing happens, no crash, no console error | |
| 4.11 | GATE | Add node → undo → add a different node | Redo stack is cleared (the divergent action wipes forward history) | |
| 4.12 | GATE | Load a template → immediately press Cmd+Z | Nothing happens — history was reset on template load | |
| 4.13 | GATE | Click Reset canvas → confirm → press Cmd+Z | Nothing happens — history was reset on clear | |
| 4.14 | GATE | Click the Undo toolbar button | Same as Cmd+Z — last action undone | |
| 4.15 | GATE | Click the Redo toolbar button | Same as Cmd+Shift+Z — last undo redone | |
| 4.16 | VERIFY | Undo/Redo toolbar buttons show disabled state correctly | Undo greyed out when stack empty, Redo greyed out when no undone actions | |
| 4.17 | GATE | Focus an input field (e.g. node label) → press Cmd+Z | Undo fires (not browser's native input undo) — canvas state reverts | |

---

## Gate 5 — Topology Validation

| # | Priority | Steps | Expected | Pass? |
|---|---|---|---|---|
| 5.1 | GATE | Add a Database node with nothing upstream | Warning appears in validation badge/sheet | |
| 5.2 | GATE | Add a Client node with nothing downstream | Warning appears | |
| 5.3 | GATE | Create a cycle: A→B→C→A | Warning flagged (not error). Cycle nodes highlighted in UI. "Run anyway" allowed | |
| 5.4 | GATE | Fix the cycle (remove one edge) | Warning clears immediately | |
| 5.5 | VERIFY | Click on a validation warning | Highlights or scrolls to the relevant node | |
| 5.6 | GATE | Create a real error (e.g. node with invalid config) → try to start sim | Simulation blocked with error modal | |
| 5.7 | GATE | Warnings only (no errors) → start sim | Warning confirmation shown → can proceed | |

---

## Gate 6 — Save / Load / Diagram Identity

These tests verify the save-overwrite bug is fixed. Each path that replaces the canvas must
clear `currentDiagramId` so a subsequent Save creates a new diagram, not overwrite the old one.

| # | Priority | Steps | Expected | Pass? |
|---|---|---|---|---|
| 6.1 | GATE | Sign in → add nodes → Save | New diagram created. "Save" button becomes disabled. Diagram name persists | |
| 6.2 | GATE | Edit the saved diagram → Save again | Updates the **same** diagram (open My Diagrams — only 1 entry, not 2) | |
| 6.3 | GATE | Open My Diagrams → list shows saved diagrams | Diagrams listed with names, ordered by recent | |
| 6.4 | GATE | Click a diagram to open it | Canvas loads that diagram, config panel shows correct values | |
| 6.5 | GATE | Open a diagram with unsaved changes on canvas | "Unsaved changes. Discard?" confirm dialog appears | |
| 6.6 | GATE | Confirm discard | New diagram loads, previous work gone | |
| 6.7 | GATE | Cancel discard | Modal stays, canvas unchanged | |
| 6.8 | GATE | **CRITICAL**: Save diagram "A" → click Reset → build something new → Save | A **new** diagram "Untitled Diagram" is created — "A" is NOT overwritten | |
| 6.9 | GATE | **CRITICAL**: Save diagram "A" → load a template → build on it → Save | A **new** diagram is created — "A" is NOT overwritten | |
| 6.10 | GATE | **CRITICAL**: Save diagram "A" → click Clear Canvas in templates sidebar → Save | Creates new, doesn't overwrite "A" | |
| 6.11 | GATE | Delete a diagram from list | Confirm dialog appears → on confirm, row disappears | |
| 6.12 | GATE | Delete the currently-open diagram | Canvas clears after deletion | |
| 6.13 | VERIFY | Currently open diagram shows "open" indicator in list | |
| 6.14 | GATE | Refresh page mid-session (with unsaved work) | State restored from localStorage: topology, diagram name, isDirty, diagram ID all preserved | |
| 6.15 | GATE | After refresh (6.14), Save | Updates the correct diagram (not a duplicate) | |
| 6.16 | VERIFY | Close tab with unsaved changes | Browser "Leave site?" beforeunload prompt fires | |

---

## Gate 7 — Share & Fork

| # | Priority | Steps | Expected | Pass? |
|---|---|---|---|---|
| 7.1 | GATE | Share button disabled when no diagram is saved | Tooltip: "Save your diagram first to share it" | |
| 7.2 | GATE | Save a diagram → click Share | Modal opens showing "Create share link" button (NOT auto-published) | |
| 7.3 | GATE | Click "Create share link" | URL generated and displayed in a copyable input field | |
| 7.4 | GATE | Click Copy → paste somewhere | Correct URL in clipboard | |
| 7.5 | GATE | Open the share link in incognito | SharedViewPage loads with read-only canvas showing the diagram | |
| 7.6 | GATE | Try to drag nodes on shared view | Nothing moves — read-only | |
| 7.7 | GATE | Click Fork on shared view without being signed in | Auth modal opens | |
| 7.8 | GATE | Sign in → Fork completes | "Forked!" toast, diagram appears in My Diagrams with "(fork)" suffix | |
| 7.9 | GATE | Click "Make Private (revoke link)" in Share modal | Link revoked, modal shows "Create share link" again (not closed) | |
| 7.10 | GATE | Open the revoked link in incognito | "Not found" or 404 page — not an error or crash | |
| 7.11 | GATE | Re-share after revoking | New link generated, old link stays dead | |
| 7.12 | VERIFY | Open Share modal on an already-shared diagram | Shows the existing link (doesn't re-publish or create a second) | |

---

## Gate 8 — Templates

| # | Priority | Steps | Expected | Pass? |
|---|---|---|---|---|
| 8.1 | GATE | Click "Templates" in toolbar | Templates sidebar opens, categories visible | |
| 8.2 | GATE | Check all templates are listed | 10 templates: Blank Canvas, Simple Web App, Cached Web App, URL Shortener, Social Feed, Video Streaming, Ride Sharing, AI Agent, Microservices, Queue Worker | |
| 8.3 | GATE | Click a template card | Detail view with overview, components list, "Watch For", "Try This" | |
| 8.4 | GATE | Apply "Simple Web App" template | Canvas loads topology: Client → LB → API Servers → Database | |
| 8.5 | GATE | Apply template with unsaved changes on canvas | Discard confirmation dialog fires first | |
| 8.6 | GATE | Apply "AI Agent Orchestration" template → start sim | Sim starts with a cycle warning ("Run anyway") — previously this was blocked entirely | |
| 8.7 | GATE | Apply "Ride Sharing" template → start sim | Same — cycle warning, can run anyway | |
| 8.8 | GATE | Apply "Microservices" template | Canvas loads correctly with all nodes and edges | |
| 8.9 | GATE | Apply "Queue Worker" template | Canvas loads correctly | |
| 8.10 | VERIFY | After applying a template, undo history is empty | Cmd+Z does nothing | |

---

## Gate 9 — Simulation Engine

| # | Priority | Steps | Expected | Pass? |
|---|---|---|---|---|
| 9.1 | GATE | Build Client→LB→API→DB, start simulation | Sim runs, MetricsPanel appears at bottom, particles flow along edges | |
| 9.2 | GATE | Check throughput sparkline | Updates every ~200ms, value matches expected RPS flow | |
| 9.3 | GATE | Set a node's failureRate to 0.5, start sim | Error rate sparkline goes up | |
| 9.4 | VERIFY | Latency p95 > 500ms | Value shown in orange | |
| 9.5 | VERIFY | System health < 40 | Score and bar turn red | |
| 9.6 | VERIFY | System health > 70 | Score and bar turn green | |
| 9.7 | GATE | Click Stop | Simulation stops, MetricsPanel disappears, timer resets | |
| 9.8 | GATE | Click Pause → Resume | Simulation freezes → continues from where it left off | |
| 9.9 | GATE | **Speed test**: Run at 1x for 10s, note elapsed. Run at 4x for 10s wall-clock | Elapsed shows ~40s (4x simulated time). Cost accrual is 4x, NOT 16x | |
| 9.10 | GATE | **Speed test**: Run at 0.25x for 10s wall-clock | Elapsed shows ~2.5s. Cost is 0.25x, NOT 0.0625x | |
| 9.11 | GATE | **Live config edit**: Start sim → change a node's capacity mid-run | Metrics reflect the change within 1-2 ticks (no need to stop/restart) | |
| 9.12 | GATE | **Live config edit**: Start sim → change Client RPS mid-run | Throughput changes visible in sparkline | |
| 9.13 | GATE | Open a saved diagram while sim is running | Simulation stops first, then new topology loads | |
| 9.14 | GATE | Apply a template while sim is running | Simulation stops first, then template loads | |
| 9.15 | GATE | Start sim → stop → start again | Clean restart, no stale data from previous run (requests counter at 0) | |
| 9.16 | GATE | Requests counter in HUD | Accumulates over time, does NOT jump down when traffic changes | |
| 9.17 | VERIFY | Sparklines show ~24s rolling window | Old data scrolls off the left | |
| 9.18 | VERIFY | Bottleneck node detected | Orange alert bar shows the bottleneck node's label | |

---

## Gate 10 — Chaos Engineering

| # | Priority | Steps | Expected | Pass? |
|---|---|---|---|---|
| 10.1 | GATE | Start sim → right-click a node | Context menu with valid chaos scenarios for that node type | |
| 10.2 | GATE | Right-click an edge | Only edge-targeted scenarios shown (Latency, Bandwidth, Partition, etc.) — NOT node-only ones like LB Failure, DNS Failure, Blackhole | |
| 10.3 | GATE | Right-click a node with no applicable scenarios | Menu does NOT appear | |
| 10.4 | GATE | Select a scenario → set severity → click Fire | Chaos activates, purple ring appears on node | |
| 10.5 | GATE | Check MetricsPanel chaos banner | Shows scenario name, blast radius %, affected node count | |
| 10.6 | GATE | Check chaos event log | "ON" event logged with timestamp | |
| 10.7 | GATE | Remove chaos via X button in context menu | Node reverts, "OFF" logged, purple ring gone | |
| 10.8 | VERIFY | Stack 2 chaos scenarios on one node | Both appear in "Active" section of context menu, both have engine effect | |
| 10.9 | GATE | Press Escape with context menu open | Menu closes | |
| 10.10 | GATE | Click outside context menu | Menu closes | |
| 10.11 | GATE | Stop simulation with chaos active | All chaos clears (no stale purple rings or pills after stop) | |

**Previously broken chaos scenarios — verify engine effect:**

| # | Priority | Scenario | Steps | Expected |
|---|---|---|---|---|
| 10.C1 | GATE | APP_GC_PAUSE | Fire on an API Server during sim | Node periodically freezes (RPS drops to 0 for pause phase), utilization spikes to 100%, latency spikes. Visible in metrics | |
| 10.C2 | GATE | TRAFFIC_PAYLOAD_EXPLOSION | Fire on a Microservice or API Server | RPS multiplied, latency increases by ~30ms. Throughput and latency sparklines react | |
| 10.C3 | GATE | DATA_CACHE_PERSISTENCE | Fire on a Cache node | Hit rate drops to 0% (cold cache), latency increases ~300ms. Downstream DB gets hammered | |
| 10.C4 | GATE | NET_BLACKHOLE | Fire on a node | Traffic silently drops to 0 — but global error rate does NOT spike to 100% (silent drop, not failure) | |
| 10.C5 | GATE | WAF node under normal operation | Add WAF with blockRate=0.3 | WAF blocks 30% of traffic (outRps reduced) but global error rate stays near 0 (blocked != error) | |

**Drag-to-inject chaos:**

| # | Priority | Steps | Expected |
|---|---|---|---|
| 10.D1 | GATE | Start sim → drag a chaos card from NodeLibrary chaos tab onto a node on canvas | Context menu opens with that scenario pre-selected, positioned near the drop target | |
| 10.D2 | GATE | Drag chaos card onto empty canvas (not near any node) | Nothing happens (no crash, no orphaned menu) | |
| 10.D3 | VERIFY | Drag a node-only chaos card near an incompatible node type | Card rejected (wrong target type), nothing fires | |

---

## Gate 11 — Cost Panel

| # | Priority | Steps | Expected | Pass? |
|---|---|---|---|---|
| 11.1 | GATE | Start simulation | Cost panel shows Rate/hr with real dollar values (NOT $0) | |
| 11.2 | GATE | Verify per-node cost hint in config panel | Shows the node's base hourly rate (reads from CostStore.BASE_HR) | |
| 11.3 | GATE | Run sim for 30s at 1x speed, note Spent. Run for 30s at 4x | Spent at 4x should be ~4x the 1x amount (NOT 16x — no speed squaring) | |
| 11.4 | GATE | Edit the budget input field | Progress bar updates immediately | |
| 11.5 | GATE | Simulate long enough to exceed budget | Bar turns red, "Over budget!" text appears | |
| 11.6 | VERIFY | "Top costs" section | Lists the nodes with the highest rate | |
| 11.7 | VERIFY | Collapse/expand Cost strip | Toggle works | |
| 11.8 | VERIFY | Collapse/expand Metrics strip | Toggle works | |

---

## Gate 12 — Cross-Feature & Edge Cases

| # | Priority | Steps | Expected | Pass? |
|---|---|---|---|---|
| 12.1 | GATE | Sign out while simulation is running | Simulation keeps running (local sim, no auth needed) | |
| 12.2 | GATE | Save during a running simulation | Save succeeds, simulation continues unaffected | |
| 12.3 | GATE | Share a diagram with chaos active | Shared view shows clean topology (no chaos state leaks) | |
| 12.4 | GATE | Fork a shared diagram → run simulation on the fork | Works independently, no coupling to original | |
| 12.5 | GATE | Delete currently-open diagram from My Diagrams | Canvas clears, diagram name resets to "Untitled Diagram" | |
| 12.6 | GATE | Open the app in two tabs, save in tab A, open My Diagrams in tab B | Tab B shows the saved diagram (Supabase is the source of truth) | |
| 12.7 | VERIFY | Console errors during normal workflow | Zero — check console after running through gates 1-11 | |
| 12.8 | GATE | Worker crash during simulation | Toast error shown ("Simulation error"), simulation stops — NOT a frozen/silent failure | |

---

## Gate 13 — Backend Health

Run these against the deployed backend (or local with real Supabase).

| # | Priority | Steps | Expected | Pass? |
|---|---|---|---|---|
| 13.1 | GATE | `GET /health` | Returns `{ "status": "ok", "version": "1.0.0" }` | |
| 13.2 | GATE | `GET /api/v1/presets` | Returns 7 presets (web_app, cached_web_app, url_shortener, social_feed, video_streaming, ride_sharing, ai_agent) | |
| 13.3 | GATE | `GET /api/v1/presets/web_app` | Returns full preset with topology JSON | |
| 13.4 | GATE | `GET /api/v1/presets/nonexistent` | Returns 404 | |
| 13.5 | GATE | Any authenticated endpoint without token | Returns 401 | |
| 13.6 | GATE | Any authenticated endpoint with expired token | Returns 401 | |
| 13.7 | VERIFY | Concurrent save requests (e.g. rapid double-click) | Both succeed or second one wins cleanly — no 500 error | |
| 13.8 | GATE | CORS: request from your Vercel production URL | Headers present, request succeeds | |
| 13.9 | GATE | CORS: request from a Vercel preview URL (*.vercel.app) | Headers present, request succeeds | |
| 13.10 | GATE | CORS: request from an unauthorized origin | Blocked by CORS | |

---

## Gate 14 — Regression Checklist (Bug Fixes)

Every bug from the QA report — verify the fix holds.

| # | Bug | Repro Steps | Expected (fixed behavior) | Pass? |
|---|---|---|---|---|
| 14.1 | Template cycles blocked sim | Load AI Agent or Ride Sharing → Simulate | Warning shown, "Run anyway" works | |
| 14.2 | Save overwrites wrong diagram | Save "A" → Reset → build new → Save | New diagram created, "A" untouched | |
| 14.3 | Live config edits ignored | Start sim → change capacity mid-run | Metrics reflect change within 1-2 ticks | |
| 14.4 | Loading diagram didn't stop sim | Start sim → open a saved diagram | Sim stops, new topology loads cleanly | |
| 14.5 | 3 no-op chaos scenarios | Fire GC Pause, Payload Explosion, Cache Persistence | All have visible engine effect | |
| 14.6 | Drag-to-inject dead flow | Drag chaos card onto node during sim | Context menu opens at drop position | |
| 14.7 | Edge menu showed node-only scenarios | Right-click an edge | Only edge-targeted scenarios (Latency, Bandwidth, etc.) | |
| 14.8 | Speed applied twice (speed^2) | Run at 4x, check cost | Cost accrues at 4x, NOT 16x | |
| 14.9 | Delete diagram no confirmation | Click trash icon on a diagram | Confirm dialog first | |
| 14.10 | No error boundaries | (Covered by Gate 1.5) | ErrorBoundary catches render errors | |
| 14.11 | Sync I/O blocking event loop | (Backend) concurrent API requests | Responses not serialized — threadpool handles concurrent requests | |
| 14.12 | Refresh loses diagram identity | Save diagram → refresh → Save again | Updates same diagram (no duplicate) | |
| 14.13 | Raw JSON error bodies shown | Trigger a 404 in share flow | User-friendly error message, not `{"detail":"..."}` | |
| 14.14 | Share auto-published on modal open | Click Share on a saved diagram | "Create share link" button shown, NOT auto-published | |
| 14.15 | requireAuth dropped pending action | Click Save (not signed in) → sign in | Save completes after sign-in | |
| 14.16 | Avatar dropdown no outside-click close | Click avatar → click elsewhere | Dropdown closes | |
| 14.17 | Delete open diagram didn't clear canvas | Delete the currently-open diagram | Canvas clears | |
| 14.18 | totalRequests jumped down on traffic change | Watch HUD requests counter when traffic shifts | Counter only goes up, never jumps down | |
| 14.19 | NumInput didn't enforce max | Set LB replicas to 100 (max is 32) → blur | Clamps to 32 | |
| 14.20 | WAF blockRate inflated global errors | Add WAF with blockRate=0.3, run sim | Global error rate near 0 (blocked != error) | |
| 14.21 | Blackhole set 100% failure | Fire NET_BLACKHOLE on a node | Traffic drops to 0 but error rate stays near 0 (silent drop) | |
| 14.22 | Stale chaos after sim stop | Activate chaos → stop sim | All chaos clears, no stale purple rings | |
| 14.23 | index.html title "frontend" | Check browser tab title | Says "SimuFlow" | |

---

## Suggested Test Order

1. **Gate 1** (boot) — if the app doesn't load, nothing else matters
2. **Gate 2** (auth) — needed for save/share tests
3. **Gate 3** (canvas) — core interaction surface
4. **Gate 4** (undo/redo) — new feature, needs thorough verification
5. **Gate 5** (validation) — gates simulation
6. **Gate 6** (save/load) — critical data integrity tests
7. **Gate 8** (templates) — depends on save identity working
8. **Gate 9** (simulation) — core engine tests
9. **Gate 10** (chaos) — depends on running sim
10. **Gate 11** (cost) — depends on running sim
11. **Gate 7** (share/fork) — depends on saved diagrams
12. **Gate 12** (cross-feature) — integration edge cases
13. **Gate 13** (backend) — can run in parallel with frontend gates
14. **Gate 14** (regressions) — final sweep, many overlap with above

---

## Pass Criteria

- **All GATE items must pass** — any failure blocks deployment
- **VERIFY items should pass** — flag failures but they don't block launch
- **Zero console errors** during the full test run
- **No white screens** — ErrorBoundary must catch any render failure
