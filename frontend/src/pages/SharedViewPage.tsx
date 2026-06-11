import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  MarkerType,
  useReactFlow,
  type Node,
  type Edge,
} from '@xyflow/react'
import { observer } from 'mobx-react-lite'
import { GitFork, Loader2, AlertTriangle, ExternalLink } from 'lucide-react'
import { api } from '../lib/api'
import { authStore } from '../stores/AuthStore'
import { nodeTypes } from '../components/canvas/nodeTypes'
import { edgeTypes } from '../components/canvas/edgeTypes'
import AuthModal from '../components/ui/AuthModal'
import type { TopologySchema, SimNode, SimEdge, StructuralNode } from '../types/topology'

// ── Topology → ReactFlow conversion ──────────────────────────────────────────

function buildRFNodes(topology: TopologySchema): Node[] {
  const simNodes: Node[] = (topology.nodes as SimNode[]).map(n => ({
    id:       n.id,
    type:     'custom',
    position: n.position,
    data:     { simNode: n },
    zIndex:   1,
  }))
  const structNodes: Node[] = ((topology.structuralNodes ?? []) as StructuralNode[]).map(sn => ({
    id:       sn.id,
    type:     'structural',
    position: sn.position,
    data:     { structuralNode: sn },
    style:    { width: sn.width, height: sn.height },
    zIndex:   -1,
  }))
  return [...structNodes, ...simNodes]
}

function buildRFEdges(topology: TopologySchema): Edge[] {
  return (topology.edges as SimEdge[]).map(e => ({
    id:        e.id,
    source:    e.sourceId,
    target:    e.targetId,
    type:      'particle',
    label:     e.label,
    markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: '#4a4a6a' },
  }))
}

// ── Inner canvas (needs useReactFlow) ────────────────────────────────────────

function SharedCanvas({ topology }: { topology: TopologySchema }) {
  const { setViewport } = useReactFlow()

  useEffect(() => {
    if (topology.viewport) setViewport(topology.viewport, { duration: 0 })
  }, [])

  return (
    <ReactFlow
      nodes={buildRFNodes(topology)}
      edges={buildRFEdges(topology)}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      panOnDrag
      zoomOnScroll
      minZoom={0.2}
      maxZoom={2}
      deleteKeyCode={null}
      proOptions={{ hideAttribution: true }}
    >
      <Background gap={20} color="#2a2a3d" variant={'dots' as any} />
    </ReactFlow>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

type State = 'loading' | 'error' | 'ready' | 'forking' | 'forked'

const SharedViewPage = observer(() => {
  const { token }      = useParams<{ token: string }>()
  const navigate       = useNavigate()
  const [state, setState]         = useState<State>('loading')
  const [topology, setTopology]   = useState<TopologySchema | null>(null)
  const [diagramName, setName]    = useState('')
  const [forkCount, setForkCount] = useState(0)
  const [errorMsg, setErrorMsg]   = useState('')

  useEffect(() => {
    if (!token) { setState('error'); setErrorMsg('Invalid share link.'); return }
    api.shared.get(token)
      .then(diagram => {
        setTopology(diagram.topology as TopologySchema)
        setName(diagram.name)
        setForkCount((diagram as any).forkCount ?? 0)
        setState('ready')
      })
      .catch(e => { setErrorMsg(e.message || 'Diagram not found.'); setState('error') })
  }, [token])

  const handleFork = useCallback(async () => {
    if (!token) return
    authStore.requireAuth(async () => {
      setState('forking')
      try {
        await api.shared.fork(token)
        setState('forked')
      } catch (e: any) {
        setErrorMsg(e.message || 'Fork failed.')
        setState('ready')
      }
    })
  }, [token])

  return (
    <div className="flex flex-col h-screen w-screen bg-app-bg overflow-hidden">
      <AuthModal />

      {/* Top bar */}
      <header className="h-12 flex items-center px-4 gap-3 bg-app-surface border-b border-app-border shrink-0">
        {/* Brand */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 shrink-0 hover:opacity-80 transition-opacity"
        >
          <div className="w-6 h-6 rounded-md bg-app-accent flex items-center justify-center text-white text-xs font-bold select-none">
            S
          </div>
          <span className="text-sm font-semibold text-app-text hidden sm:block">SimuFlow</span>
        </button>

        <div className="w-px h-5 bg-app-border shrink-0" />

        {/* Diagram name */}
        {diagramName && (
          <span className="text-sm font-medium text-app-text truncate max-w-xs">{diagramName}</span>
        )}

        {forkCount > 0 && (
          <span className="text-[11px] text-app-text-3 flex items-center gap-1 shrink-0">
            <GitFork size={11} />
            {forkCount}
          </span>
        )}

        <div className="flex-1" />

        <span className="text-[11px] text-app-text-3 hidden sm:block shrink-0">View only</span>

        {state === 'forked' ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-green-400 font-medium">Forked! Find it in My Diagrams.</span>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-app-accent hover:bg-app-accent-dim text-white transition-colors"
            >
              <ExternalLink size={12} />
              Open workspace
            </button>
          </div>
        ) : (
          <button
            onClick={handleFork}
            disabled={state !== 'ready'}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-app-accent hover:bg-app-accent-dim text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            {state === 'forking'
              ? <Loader2 size={12} className="animate-spin" />
              : <GitFork size={12} />
            }
            {state === 'forking' ? 'Forking…' : 'Fork to my workspace'}
          </button>
        )}
      </header>

      {/* Canvas area */}
      <main className="flex-1 overflow-hidden relative">
        {state === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 size={28} className="animate-spin text-app-text-3" />
          </div>
        )}

        {state === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <AlertTriangle size={28} className="text-app-text-3" />
            <p className="text-sm text-app-text-2">{errorMsg}</p>
            <button
              onClick={() => navigate('/')}
              className="text-xs text-app-accent hover:underline mt-1"
            >
              Go to SimuFlow
            </button>
          </div>
        )}

        {(state === 'ready' || state === 'forking' || state === 'forked') && topology && (
          <ReactFlowProvider>
            <SharedCanvas topology={topology} />
          </ReactFlowProvider>
        )}
      </main>
    </div>
  )
})

export default SharedViewPage
