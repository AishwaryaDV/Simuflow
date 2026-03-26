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
