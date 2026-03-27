import { useCallback, useEffect, useRef } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  ConnectionMode,
  useReactFlow,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react'
import { observer } from 'mobx-react-lite'
import { runInAction } from 'mobx'
import { graphStore } from '../../stores/GraphStore'
import { nodeTypes } from './nodeTypes'
import { edgeTypes } from './edgeTypes'
import { createDefaultNode } from './nodeConfig'
import type { CustomNodeData } from './CustomNode'
import { NodeType } from '../../types/topology'

const SNAP_GRID: [number, number] = [20, 20]

const CanvasPanel = observer(() => {
  const { setViewport, screenToFlowPosition } = useReactFlow()
  const prevLoadKey = useRef(graphStore.loadKey)

  // ── Derive RF nodes/edges directly — MobX observer tracks all accesses ────
  const rfNodes: Node<CustomNodeData>[] = Array.from(graphStore.nodes.values()).map(simNode => ({
    id: simNode.id,
    type: 'custom' as const,
    position: simNode.position,
    data: { simNode },
    selected: simNode.id === graphStore.selectedNodeId,
  }))

  const rfEdges: Edge[] = Array.from(graphStore.edges.values()).map(simEdge => ({
    id: simEdge.id,
    source: simEdge.sourceId,
    target: simEdge.targetId,
    type: 'particle' as const,
    label: simEdge.label,
  }))

  // Sync ReactFlow viewport whenever a preset is loaded or canvas is cleared
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
        if (change.type === 'position' && !change.dragging && change.position) {
          graphStore.updateNodeConfig(change.id, { position: change.position } as any)
        } else if (change.type === 'remove') {
          graphStore.removeNode(change.id)
        } else if (change.type === 'select') {
          if (change.selected) graphStore.selectNode(change.id)
          else if (graphStore.selectedNodeId === change.id) graphStore.selectNode(null)
        }
      }
    })
  }, [])

  // ── Edge changes ──────────────────────────────────────────────────────────
  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    runInAction(() => {
      for (const change of changes) {
        if (change.type === 'remove') graphStore.disconnectEdge(change.id)
      }
    })
  }, [])

  // ── New connection ────────────────────────────────────────────────────────
  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return
    runInAction(() => graphStore.connectNodes(connection.source!, connection.target!))
  }, [])

  // ── Deselect on background click ──────────────────────────────────────────
  const onPaneClick = useCallback(() => {
    runInAction(() => graphStore.selectNode(null))
  }, [])

  // ── Drag-drop from NodeLibrary ────────────────────────────────────────────
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const nodeType = e.dataTransfer.getData('application/simuflow-node-type') as NodeType
      if (!nodeType || !Object.values(NodeType).includes(nodeType)) return

      const raw = screenToFlowPosition({ x: e.clientX, y: e.clientY })
      const position = {
        x: Math.round(raw.x / SNAP_GRID[0]) * SNAP_GRID[0],
        y: Math.round(raw.y / SNAP_GRID[1]) * SNAP_GRID[1],
      }
      runInAction(() => graphStore.addNode(createDefaultNode(nodeType, position)))
    },
    [screenToFlowPosition],
  )

  // ── Persist viewport on pan/zoom end ─────────────────────────────────────
  const onMoveEnd = useCallback(
    (_: unknown, vp: { x: number; y: number; zoom: number }) => {
      runInAction(() => graphStore.setViewport(vp))
    },
    [],
  )

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneClick={onPaneClick}
        onMoveEnd={onMoveEnd}
        onDrop={onDrop}
        onDragOver={onDragOver}
        connectionMode={ConnectionMode.Loose}
        snapToGrid
        snapGrid={SNAP_GRID}
        defaultEdgeOptions={{ type: 'particle' }}
        deleteKeyCode="Delete"
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} color="#e2e8f0" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  )
})

export default CanvasPanel
