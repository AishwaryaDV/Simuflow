import { useEffect, useCallback } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { observer } from 'mobx-react-lite'
import Toolbar from '../panels/Toolbar'
import NodeLibrary from '../library/NodeLibrary'
import CanvasPanel from '../canvas/CanvasPanel'
import ConfigPanel from '../panels/ConfigPanel'
import EdgeConfigPanel from '../canvas/EdgeConfigPanel'
import SimulationHUD from '../canvas/SimulationHUD'
import MetricsPanel from '../panels/MetricsPanel'
import TemplatesSidebar from '../panels/TemplatesSidebar'
import TemplateBadge from '../canvas/TemplateBadge'
import ConfirmDialog from '../ui/ConfirmDialog'
import ErrorBoundary from '../ui/ErrorBoundary'
import ValidationErrorModal from '../ui/ValidationErrorModal'
import ValidationWarningSheet from '../ui/ValidationWarningSheet'
import Toast from '../ui/Toast'
import AuthModal from '../ui/AuthModal'
import DiagramsModal from '../ui/DiagramsModal'
import { useLocalStoragePersistence } from '../../hooks/useLocalStoragePersistence'
import { useWorkerBridge } from '../../hooks/useWorkerBridge'
import { uiStore } from '../../stores/UIStore'
import { graphStore } from '../../stores/GraphStore'

import { PanelRightOpen } from 'lucide-react'
import { runInAction } from 'mobx'

const CollapsedRightPanel = observer(function CollapsedRightPanel() {
  const expand = useCallback(() => runInAction(() => uiStore.toggleRightPanel()), [])
  return (
    <aside className="w-10 bg-app-surface border-l border-app-border flex flex-col items-center pt-3 shrink-0">
      <button
        onClick={expand}
        className="p-1.5 rounded-lg text-app-text-3 hover:text-app-text hover:bg-app-elevated transition-colors"
        title="Expand panel"
      >
        <PanelRightOpen size={16} strokeWidth={1.8} />
      </button>
    </aside>
  )
})

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
const WorkspaceLayout = observer(function WorkspaceLayout() {
  useLocalStoragePersistence()
  useWorkerBridge()

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (graphStore.isDirty) e.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  return (
    <ReactFlowProvider>
      <AuthModal />
      <DiagramsModal />
      <ConfirmDialog />
      <ValidationErrorModal />
      <ValidationWarningSheet />
      <Toast />
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-app-bg">
        <Toolbar />
        <div className="flex flex-1 overflow-hidden">
          <NodeLibrary />
          <div className="flex flex-col flex-1 overflow-hidden">
            <main className="flex-1 overflow-hidden relative">
              <ErrorBoundary label="canvas">
                <CanvasPanel />
                <EdgeConfigPanel />
                {uiStore.templateMode && <TemplateBadge />}
                <SimulationHUD />
              </ErrorBoundary>
            </main>
            <MetricsPanel />
          </div>
          {uiStore.panelState.templates
            ? <TemplatesSidebar />
            : !uiStore.rightPanelCollapsed
              ? <ConfigPanel />
              : <CollapsedRightPanel />
          }
        </div>
      </div>
    </ReactFlowProvider>
  )
})

export default WorkspaceLayout
