import { ReactFlowProvider } from '@xyflow/react'
import Toolbar from '../panels/Toolbar'
import NodeLibrary from '../library/NodeLibrary'
import CanvasPanel from '../canvas/CanvasPanel'
import ConfigPanel from '../panels/ConfigPanel'
import { useLocalStoragePersistence } from '../../hooks/useLocalStoragePersistence'

/**
 * 5-zone workspace shell:
 *
 *  ┌────────────────────────────────────┐
 *  │          Toolbar (56px)            │
 *  ├───────────┬────────────┬───────────┤
 *  │ NodeLib   │   Canvas   │ Config    │
 *  │ (288px)   │  (flex-1)  │ (320px)   │
 *  └───────────┴────────────┴───────────┘
 *
 * Bottom panel (metrics/chaos) is added in Phase 3.
 * ReactFlowProvider wraps everything so CanvasPanel and
 * any child that calls useReactFlow() share the same instance.
 */
export default function WorkspaceLayout() {
  useLocalStoragePersistence()

  return (
    <ReactFlowProvider>
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-gray-50">
        <Toolbar />
        <div className="flex flex-1 overflow-hidden">
          <NodeLibrary />
          <main className="flex-1 overflow-hidden">
            <CanvasPanel />
          </main>
          <ConfigPanel />
        </div>
      </div>
    </ReactFlowProvider>
  )
}
