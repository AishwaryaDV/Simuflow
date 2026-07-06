# SimuFlow — Testing Plan (v1)

Test feature by feature in this order. For each test: note pass/fail and any unexpected behaviour.

---

## 1. Auth

| # | Test | Expected |
|---|---|---|
| 1.1 | Land on app without signing in | Canvas fully usable, no auth wall |
| 1.2 | Click Save without signing in | Auth modal opens |
| 1.3 | Click My Diagrams without signing in | Auth modal opens |
| 1.4 | Click Share without signing in | Button is disabled (tooltip: "Save your diagram first to share it") |
| 1.5 | Sign up with email | Confirmation email arrives, green info message shown in modal |
| 1.6 | Sign in with email | Modal closes, avatar circle appears in toolbar |
| 1.7 | Sign in with Google | Redirected to Google, returns to app, avatar shown |
| 1.8 | Click avatar → Sign out | Avatar reverts to "Sign in" button |
| 1.9 | Sign in → close tab → reopen app | Still signed in (session persists via Supabase) |
| 1.10 | Sign in → click backdrop of auth modal | Modal closes |

---

## 2. Canvas — Add & Connect Nodes

| # | Test | Expected |
|---|---|---|
| 2.1 | Drag any node from library onto canvas | Node appears, Save button becomes enabled |
| 2.2 | Drag same node type twice | Both get unique IDs, both render |
| 2.3 | Click a node | Config panel opens on right |
| 2.4 | Edit node label in config panel | Label updates on canvas in real time |
| 2.5 | Edit numeric config (e.g. capacity) | Value persists, simulation uses it |
| 2.6 | Connect two nodes (drag from source handle) | Edge appears |
| 2.7 | Connect a node to itself | No self-loop created |
| 2.8 | Delete a node that has edges | Edges are also removed |
| 2.9 | Click an edge | Edge config panel opens |
| 2.10 | Delete an edge | Only edge removed, nodes stay |
| 2.11 | ~~Undo (Cmd/Ctrl+Z) after add~~ | Descoped for launch — no undo stack |
| 2.12 | ~~Undo after delete~~ | Descoped for launch — no undo stack |
| 2.13 | Pan and zoom canvas | Viewport moves/scales |

---

## 3. Topology Validation

| # | Test | Expected |
|---|---|---|
| 3.1 | Add a Database with no upstream | Warning appears (validation badge / sheet) |
| 3.2 | Add a Client with no downstream | Warning appears |
| 3.3 | Create a cycle in the graph | Warning flagged (cycle nodes highlighted); "Run anyway" allowed |
| 3.4 | Fix the issue | Badge / warning clears |
| 3.5 | Click on a validation error | Highlights or jumps to that node |
| 3.6 | Try to start simulation with errors | Blocked with error modal |
| 3.7 | Try to start with warnings only | Proceeds after confirmation |

---

## 4. Save / Load

| # | Test | Expected |
|---|---|---|
| 4.1 | Save for the first time (signed in, no diagram ID) | New diagram created, Save button disables |
| 4.2 | Edit something → Save again | Updates existing diagram (no duplicate created) |
| 4.3 | Open My Diagrams | List of saved diagrams shown |
| 4.4 | Click Open on a diagram | Canvas loads that diagram |
| 4.5 | Open diagram with unsaved changes on canvas | "Unsaved changes. Discard?" dialog appears |
| 4.6 | Confirm discard | New diagram loads, previous unsaved work gone |
| 4.7 | Cancel discard | Modal stays, canvas unchanged |
| 4.8 | Click New with unsaved changes | Same discard dialog |
| 4.9 | Close tab with unsaved changes | Browser "Leave site?" prompt |
| 4.10 | Delete a diagram from list | Row disappears; if it was open the canvas clears |
| 4.11 | Currently open diagram shows indicator | "● open" shown next to it in list |

---

## 5. Share

| # | Test | Expected |
|---|---|---|
| 5.1 | Click Share before saving | Button is disabled |
| 5.2 | Save → Click Share | Share modal opens with a copy-able link |
| 5.3 | Copy link → Open in incognito tab | SharedViewPage loads, read-only canvas |
| 5.4 | Try dragging nodes on shared view | Nothing moves (read-only) |
| 5.5 | Click Fork without auth on shared view | Auth modal opens |
| 5.6 | Sign in → Fork | "Forked! Find it in My Diagrams." message shown |
| 5.7 | Open My Diagrams after fork | Forked diagram in list with "(fork)" in name |
| 5.8 | Open workspace button after fork | Navigates to / |
| 5.9 | Click Make Private in Share modal | Revoke succeeds |
| 5.10 | Open the now-revoked link | 404 / "Not found" on SharedViewPage |

---

## 6. Presets / Templates

| # | Test | Expected |
|---|---|---|
| 6.1 | Open Templates panel | Categories and preset cards visible |
| 6.2 | Click a preset card | Detail/preview shown |
| 6.3 | Apply a preset | Canvas loads that topology |
| 6.4 | Apply preset with unsaved changes | Unsaved changes guard fires (discard dialog) |
| 6.5 | Backend API down → Open templates panel | Falls back to local topology, no crash |
| 6.6 | Check that applied preset topology matches the preset's design | Nodes and edges match the blueprint |

---

## 7. Simulation

| # | Test | Expected |
|---|---|---|
| 7.1 | Start simulation with a valid topology | Simulation runs, MetricsPanel appears at bottom |
| 7.2 | Throughput sparkline | Updates every ~200ms |
| 7.3 | Error rate sparkline | Goes up when any node has failureRate > 0 |
| 7.4 | Latency p95 > 500ms | Value shown in orange |
| 7.5 | Latency p99 > 1000ms | Value shown in orange |
| 7.6 | System health < 40 | Score and bar turn red |
| 7.7 | System health 40–70 | Yellow |
| 7.8 | System health > 70 | Green |
| 7.9 | Bottleneck node detected | Orange alert bar shows node label |
| 7.10 | Stop simulation | MetricsPanel disappears |
| 7.11 | Sparklines show 24s rolling window | Old data scrolls off the left edge |

---

## 8. Chaos

| # | Test | Expected |
|---|---|---|
| 8.1 | Right-click a node during simulation | Context menu with valid scenarios for that node type |
| 8.2 | Right-click an edge during simulation | Only NET_* network scenarios shown |
| 8.3 | Right-click a node with no valid scenarios | Menu does not appear |
| 8.4 | Select a scenario → configure severity → Fire | Chaos activates, node colour changes on canvas |
| 8.5 | Chaos cascade banner in MetricsPanel | Shows scenario name + blast radius % + affected count |
| 8.6 | Chaos event log | ON event logged with timestamp |
| 8.7 | Remove chaos (X on active row in menu) | Node reverts, OFF logged in chaos log |
| 8.8 | Stack two chaos scenarios on one node | Both appear in "Active" section of context menu |
| 8.9 | Press Escape with context menu open | Menu closes |
| 8.10 | Click outside context menu | Menu closes |

---

## 9. Cost Panel

| # | Test | Expected |
|---|---|---|
| 9.1 | Simulation running | Rate/hr and Spent values visible (may be $0 until pricing data is added) |
| 9.2 | Edit budget input | Progress bar updates immediately |
| 9.3 | Simulate long enough to exceed budget | Bar turns red, "Over budget!" text appears |
| 9.4 | Top costs section | Lists nodes with highest rate |
| 9.5 | Collapse/expand Cost strip | Toggle works |
| 9.6 | Collapse/expand Metrics strip | Toggle works |

---

## 10. Edge Cases & Cross-Feature

| # | Test | Expected |
|---|---|---|
| 10.1 | Sign out while a simulation is running | Simulation keeps running (no auth required for local sim) |
| 10.2 | Save during a running simulation | Save succeeds, simulation unaffected |
| 10.3 | Load a different diagram during simulation | Simulation stops, new topology loads |
| 10.4 | Apply a template during simulation | Same as above |
| 10.5 | Share a diagram with chaos active | Shared view shows clean (no chaos state) |
| 10.6 | Fork a shared diagram → run simulation | Works independently of original |
| 10.7 | Very large topology (30+ nodes) | Canvas still responsive, no layout freeze |
| 10.8 | Refresh page mid-session | State restored from localStorage, isDirty preserved |

---

## Cost model status

Static AWS-based pricing is live (`CostStore.BASE_HR` / `PER_MILLION_REQ`; per-node base
rate shown in ConfigPanel). Verify:

- Cost panel rate/hr shows real dollar values (not 0)
- Spent updates correctly as simulated time advances (speed× real time — not speed²)
- Over-budget alert fires at correct threshold

Per-node instance/SKU picker + provider pricing API remains post-launch (see docs/pricing-research.md).
