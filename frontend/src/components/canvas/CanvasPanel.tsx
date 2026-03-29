import { useCallback, useEffect, useRef } from 'react'
import {
  ReactFlow,
  Background,
  ConnectionMode,
  MarkerType,
  useReactFlow,
  useViewport,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react'
import { observer } from 'mobx-react-lite'
import { runInAction } from 'mobx'
import { graphStore } from '../../stores/GraphStore'
import { uiStore } from '../../stores/UIStore'
import { nodeTypes } from './nodeTypes'
import { edgeTypes } from './edgeTypes'
import { createDefaultNode, createDefaultStructuralNode } from './nodeConfig'
import { getCursorForMode } from './CanvasToolbar'
import CanvasToolbar from './CanvasToolbar'
import type { CustomNodeData } from './CustomNode'
import type { StructuralRFData } from './StructuralNodeComponent'
import { NodeType, StructuralNodeType } from '../../types/topology'

const SNAP_GRID: [number, number] = [20, 20]
const SIM_TYPES    = new Set(Object.values(NodeType))
const STRUCT_TYPES = new Set(Object.values(StructuralNodeType))

// Keyboard shortcut → canvas mode
const KEY_MODE_MAP: Record<string, Parameters<typeof uiStore.setCanvasMode>[0]> = {
  v: 'select', h: 'hand', c: 'connect', b: 'container', t: 'text', e: 'eraser',
}

function ZoomDisplay() {
  const { zoom } = useViewport()
  const { zoomIn, zoomOut, fitView } = useReactFlow()
  return (
    <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1 bg-app-surface border border-app-border rounded-lg px-2 py-1 shadow-md shadow-black/20">
      <button onClick={() => zoomOut({ duration: 150 })} className="w-6 h-6 flex items-center justify-center text-app-text-2 hover:text-app-text text-base leading-none rounded hover:bg-app-elevated transition-colors" title="Zoom out">−</button>
      <span className="text-[11px] text-app-text-2 w-10 text-center select-none tabular-nums">{Math.round(zoom * 100)}%</span>
      <button onClick={() => zoomIn({ duration: 150 })} className="w-6 h-6 flex items-center justify-center text-app-text-2 hover:text-app-text text-base leading-none rounded hover:bg-app-elevated transition-colors" title="Zoom in">+</button>
      <div className="w-px h-4 bg-app-border mx-0.5" />
      <button onClick={() => fitView({ duration: 300, padding: 0.15 })} className="text-[10px] text-app-text-3 hover:text-app-text-2 px-1 rounded hover:bg-app-elevated transition-colors" title="Fit view">Fit</button>
    </div>
  )
}

const CanvasPanel = observer(() => {
  const { setViewport, screenToFlowPosition } = useReactFlow()
  const prevLoadKey = useRef(graphStore.loadKey)
  const mode = uiStore.canvasMode

  // ── Keyboard shortcuts for mode switching ─────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const m = KEY_MODE_MAP[e.key.toLowerCase()]
      if (m) runInAction(() => uiStore.setCanvasMode(m))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // ── Derive RF nodes ───────────────────────────────────────────────────────
  const rfSimNodes: Node<CustomNodeData>[] = Array.from(graphStore.nodes.values()).map(simNode => ({
    id:       simNode.id,
    type:     'custom' as const,
    position: simNode.position,
    data:     { simNode },
    selected: simNode.id === graphStore.selectedNodeId,
    zIndex:   1,
  }))

  const rfStructNodes: Node<StructuralRFData>[] = Array.from(graphStore.structuralNodes.values()).map(sn => ({
    id:       sn.id,
    type:     'structural' as const,
    position: sn.position,
    data:     { structuralNode: sn },
    selected: sn.id === graphStore.selectedNodeId,
    style:    { width: sn.width, height: sn.height },
    zIndex:   -1,
  }))

  const rfEdges: Edge[] = Array.from(graphStore.edges.values()).map(e => ({
    id:         e.id,
    source:     e.sourceId,
    target:     e.targetId,
    type:       'particle' as const,
    label:      e.label,
    selected:   e.id === graphStore.selectedEdgeId,
    markerEnd:  { type: MarkerType.ArrowClosed, width: 16, height: 16, color: e.id === graphStore.selectedEdgeId ? '#8b5cf6' : '#4a4a6a' },
  }))

  // Sync viewport on preset load / clear
  useEffect(() => {
    if (graphStore.loadKey !== prevLoadKey.current) {
      prevLoadKey.current = graphStore.loadKey
      setViewport(graphStore.viewport, { duration: 400 })
    }
  })

  // ── Node changes ──────────────────────────────────────────────────────────
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    runInAction(() => {
      for (const change of changes) {
        if (!('id' in change)) continue
        const id = change.id
        const isStructural = graphStore.structuralNodes.has(id)

        if (change.type === 'position' && !change.dragging && change.position) {
          if (isStructural) graphStore.updateStructuralNode(id, { position: change.position })
          else graphStore.updateNodeConfig(id, { position: change.position } as any)

        } else if (change.type === 'remove') {
          if (isStructural) graphStore.removeStructuralNode(id)
          else graphStore.removeNode(id)

        } else if (change.type === 'select') {
          if (change.selected) graphStore.selectNode(id)
          else if (graphStore.selectedNodeId === id) graphStore.selectNode(null)
        }
      }
    })
  }, [])

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    runInAction(() => {
      for (const change of changes) {
        if (change.type === 'remove') graphStore.disconnectEdge(change.id)
        else if (change.type === 'select') graphStore.selectEdge(change.selected ? change.id : null)
      }
    })
  }, [])

  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return
    runInAction(() => graphStore.connectNodes(connection.source!, connection.target!))
  }, [])

  // ── Pane click — deselect or place text/container ─────────────────────────
  const onPaneClick = useCallback(
    (e: React.MouseEvent) => {
      if (mode === 'text') {
        const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY })
        const snapped = {
          x: Math.round(pos.x / SNAP_GRID[0]) * SNAP_GRID[0],
          y: Math.round(pos.y / SNAP_GRID[1]) * SNAP_GRID[1],
        }
        runInAction(() => {
          graphStore.addStructuralNode(
            createDefaultStructuralNode(StructuralNodeType.TextLabel, snapped),
          )
          uiStore.setCanvasMode('select')
        })
        return
      }

      if (mode === 'container') {
        const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY })
        const snapped = {
          x: Math.round(pos.x / SNAP_GRID[0]) * SNAP_GRID[0],
          y: Math.round(pos.y / SNAP_GRID[1]) * SNAP_GRID[1],
        }
        runInAction(() => {
          graphStore.addStructuralNode(
            createDefaultStructuralNode(StructuralNodeType.VPC, snapped),
          )
          uiStore.setCanvasMode('select')
        })
        return
      }

      runInAction(() => { graphStore.selectNode(null); graphStore.selectEdge(null) })
    },
    [mode, screenToFlowPosition],
  )

  // ── Node click — eraser mode ──────────────────────────────────────────────
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (mode === 'eraser') {
        runInAction(() => {
          if (graphStore.structuralNodes.has(node.id)) graphStore.removeStructuralNode(node.id)
          else graphStore.removeNode(node.id)
        })
      }
    },
    [mode],
  )

  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      if (mode === 'eraser') {
        runInAction(() => graphStore.disconnectEdge(edge.id))
      }
    },
    [mode],
  )

  // ── Drag-drop from NodeLibrary ────────────────────────────────────────────
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const simType    = e.dataTransfer.getData('application/simuflow-node-type') as NodeType
      const structType = e.dataTransfer.getData('application/simuflow-structural-type') as StructuralNodeType

      const raw = screenToFlowPosition({ x: e.clientX, y: e.clientY })
      const position = {
        x: Math.round(raw.x / SNAP_GRID[0]) * SNAP_GRID[0],
        y: Math.round(raw.y / SNAP_GRID[1]) * SNAP_GRID[1],
      }

      if (simType && SIM_TYPES.has(simType)) {
        runInAction(() => graphStore.addNode(createDefaultNode(simType, position)))
      } else if (structType && STRUCT_TYPES.has(structType)) {
        runInAction(() => graphStore.addStructuralNode(createDefaultStructuralNode(structType, position)))
      }
    },
    [screenToFlowPosition],
  )

  const onMoveEnd = useCallback(
    (_: unknown, vp: { x: number; y: number; zoom: number }) => {
      runInAction(() => graphStore.setViewport(vp))
    },
    [],
  )

  // ── Mode-driven ReactFlow props ───────────────────────────────────────────
  const panOnDrag      = mode === 'hand'
  const nodesDraggable = mode === 'select' || mode === 'eraser'
  const cursor         = getCursorForMode(mode)

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <CanvasToolbar />

      {/* Connect-mode hint */}
      {mode === 'connect' && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <div className="flex items-center gap-2 bg-app-elevated border border-app-accent/40 rounded-lg px-3 py-1.5 shadow-md">
            <span className="w-1.5 h-1.5 rounded-full bg-app-accent animate-pulse shrink-0" />
            <span className="text-xs text-app-text-2">Click a source node, then a destination to connect them</span>
          </div>
        </div>
      )}

      <ReactFlow
        nodes={[...rfStructNodes, ...rfSimNodes]}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneClick={onPaneClick}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onMoveEnd={onMoveEnd}
        onDrop={onDrop}
        onDragOver={onDragOver}
        panOnDrag={panOnDrag}
        nodesDraggable={nodesDraggable}
        connectionMode={ConnectionMode.Loose}
        snapToGrid
        snapGrid={SNAP_GRID}
        defaultEdgeOptions={{ type: 'particle' }}
        deleteKeyCode="Delete"
        minZoom={0.2}
        maxZoom={2}
        style={{ cursor }}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} color="#2a2a3d" variant={'dots' as any} />
        <ZoomDisplay />
      </ReactFlow>
    </div>
  )
})

export default CanvasPanel
