import { observer } from 'mobx-react-lite'
import { runInAction } from 'mobx'
import { ArrowRight, Trash2 } from 'lucide-react'
import { graphStore } from '../../stores/GraphStore'
import { EdgeProtocol } from '../../types/topology'

const PROTOCOLS = [
  { value: EdgeProtocol.HTTP,      label: 'HTTP' },
  { value: EdgeProtocol.HTTPS,     label: 'HTTPS' },
  { value: EdgeProtocol.GRPC,      label: 'gRPC' },
  { value: EdgeProtocol.WebSocket, label: 'WebSocket' },
  { value: EdgeProtocol.TCP,       label: 'TCP' },
  { value: EdgeProtocol.UDP,       label: 'UDP' },
  { value: EdgeProtocol.Custom,    label: 'Custom' },
]

const inputCls = 'text-xs border border-app-border bg-app-bg text-app-text rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-app-accent transition-colors'

const EdgeConfigPanel = observer(() => {
  const edgeId = graphStore.selectedEdgeId
  if (!edgeId) return null

  const edge = graphStore.edges.get(edgeId)
  if (!edge) return null

  const source = graphStore.nodes.get(edge.sourceId)
  const target = graphStore.nodes.get(edge.targetId)

  const patch = (p: Parameters<typeof graphStore.updateEdge>[1]) =>
    runInAction(() => graphStore.updateEdge(edgeId, p))

  return (
    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
      <div className="flex items-center gap-3 bg-app-surface border border-app-border rounded-2xl shadow-xl shadow-black/40 px-4 py-3">

        {/* Connection label */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] font-semibold text-app-text truncate max-w-[80px]">
            {source?.label ?? '?'}
          </span>
          <ArrowRight size={11} className="text-app-text-3 shrink-0" />
          <span className="text-[11px] font-semibold text-app-text truncate max-w-[80px]">
            {target?.label ?? '?'}
          </span>
        </div>

        <div className="w-px h-5 bg-app-border shrink-0" />

        {/* Label */}
        <label className="flex flex-col gap-1 shrink-0">
          <span className="text-[10px] text-app-text-3 font-medium">Label</span>
          <input
            type="text"
            value={edge.label ?? ''}
            onChange={e => patch({ label: e.target.value || undefined })}
            placeholder="optional"
            className={inputCls + ' w-28'}
            maxLength={32}
          />
        </label>

        {/* Protocol */}
        <label className="flex flex-col gap-1 shrink-0">
          <span className="text-[10px] text-app-text-3 font-medium">Protocol</span>
          <select
            value={edge.protocol ?? ''}
            onChange={e => patch({ protocol: (e.target.value as EdgeProtocol) || undefined })}
            className={inputCls + ' cursor-pointer w-28'}
          >
            <option value="">— none —</option>
            {PROTOCOLS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </label>

        <div className="w-px h-5 bg-app-border shrink-0" />

        {/* Bandwidth cap */}
        <label className="flex flex-col gap-1 shrink-0">
          <span className="text-[10px] text-app-text-3 font-medium">Bandwidth cap</span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={edge.bandwidthRps ?? 0}
              min={0}
              onChange={e => patch({ bandwidthRps: Number(e.target.value) || undefined })}
              className={inputCls + ' w-20'}
            />
            <span className="text-[10px] text-app-text-3">req/s</span>
          </div>
        </label>

        {/* Latency overhead */}
        <label className="flex flex-col gap-1 shrink-0">
          <span className="text-[10px] text-app-text-3 font-medium">Latency add</span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={edge.latencyMs ?? 0}
              min={0}
              onChange={e => patch({ latencyMs: Number(e.target.value) || undefined })}
              className={inputCls + ' w-20'}
            />
            <span className="text-[10px] text-app-text-3">ms</span>
          </div>
        </label>

        {/* Weight */}
        <label className="flex flex-col gap-1 shrink-0">
          <span className="text-[10px] text-app-text-3 font-medium">Weight</span>
          <input
            type="number"
            value={edge.weight ?? 1}
            min={1}
            max={100}
            onChange={e => patch({ weight: Number(e.target.value) })}
            className={inputCls + ' w-16'}
          />
        </label>

        <div className="w-px h-5 bg-app-border shrink-0" />

        {/* Bidirectional */}
        <label className="flex flex-col gap-1 shrink-0 cursor-pointer">
          <span className="text-[10px] text-app-text-3 font-medium">Bidirectional</span>
          <div className="flex items-center gap-1.5 py-1">
            <input
              type="checkbox"
              checked={edge.bidirectional ?? false}
              onChange={e => patch({ bidirectional: e.target.checked || undefined })}
              className="accent-app-accent w-3.5 h-3.5"
            />
            <span className="text-xs text-app-text-2">⇌</span>
          </div>
        </label>

        <div className="w-px h-5 bg-app-border shrink-0" />

        {/* Delete */}
        <button
          onClick={() => runInAction(() => graphStore.disconnectEdge(edgeId))}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
          title="Delete connection"
        >
          <Trash2 size={12} strokeWidth={1.8} />
          <span>Delete</span>
        </button>
      </div>
    </div>
  )
})

export default EdgeConfigPanel
