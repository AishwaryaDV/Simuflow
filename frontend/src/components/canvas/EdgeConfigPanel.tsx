import { observer } from 'mobx-react-lite'
import { runInAction } from 'mobx'
import { ArrowRight, ArrowLeftRight, Trash2 } from 'lucide-react'
import { graphStore } from '../../stores/GraphStore'
import { EdgeProtocol } from '../../types/topology'

const PROTOCOLS: { value: EdgeProtocol; label: string }[] = [
  { value: EdgeProtocol.HTTP,      label: 'HTTP' },
  { value: EdgeProtocol.HTTPS,     label: 'HTTPS' },
  { value: EdgeProtocol.GRPC,      label: 'gRPC' },
  { value: EdgeProtocol.WebSocket, label: 'WS' },
  { value: EdgeProtocol.TCP,       label: 'TCP' },
  { value: EdgeProtocol.UDP,       label: 'UDP' },
  { value: EdgeProtocol.Custom,    label: 'Custom' },
]

const DEFAULT_PROTOCOL = EdgeProtocol.HTTP

const inputCls = 'text-xs border border-app-border bg-app-bg text-app-text rounded-lg px-2 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-app-accent transition-colors'

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[10px] text-app-text-3 font-medium shrink-0 w-20">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  )
}

const EdgeConfigPanel = observer(() => {
  const edgeId = graphStore.selectedEdgeId
  if (!edgeId) return null

  const edge = graphStore.edges.get(edgeId)
  if (!edge) return null

  const source = graphStore.nodes.get(edge.sourceId)
  const target = graphStore.nodes.get(edge.targetId)
  const activeProtocol = edge.protocol ?? DEFAULT_PROTOCOL

  const patch = (p: Parameters<typeof graphStore.updateEdge>[1]) =>
    runInAction(() => graphStore.updateEdge(edgeId, p))

  return (
    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
      <div className="bg-app-surface border border-app-border rounded-2xl shadow-xl shadow-black/40 w-80">

        {/* Header */}
        <div className="px-4 py-3 border-b border-app-border">
          <p className="text-[11px] font-bold uppercase tracking-widest text-app-text-3">Connection options</p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="text-sm font-semibold text-app-text truncate max-w-[100px]">{source?.label ?? '?'}</span>
            <ArrowRight size={12} className="text-app-text-3 shrink-0" />
            <span className="text-sm font-semibold text-app-text truncate max-w-[100px]">{target?.label ?? '?'}</span>
          </div>
        </div>

        {/* Body */}
        <div className="px-4 py-3 flex flex-col gap-3">

          {/* Protocol pills */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] text-app-text-3 font-medium">Protocol</span>
            <div className="flex flex-wrap gap-1.5">
              {PROTOCOLS.map(p => (
                <button
                  key={p.value}
                  onClick={() => patch({ protocol: p.value })}
                  className={[
                    'text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors',
                    activeProtocol === p.value
                      ? 'bg-app-accent/20 border-app-accent text-app-accent'
                      : 'border-app-border text-app-text-2 hover:border-app-accent/50 hover:text-app-text',
                  ].join(' ')}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Label */}
          <FieldRow label="Label">
            <input
              type="text"
              value={edge.label ?? ''}
              onChange={e => patch({ label: e.target.value || undefined })}
              placeholder="optional"
              className={inputCls}
              maxLength={32}
            />
          </FieldRow>

          {/* Numeric fields — 3 in a row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-app-text-3 font-medium">Bandwidth</span>
              <div className="flex items-center gap-1">
                <input type="number" value={edge.bandwidthRps ?? 0} min={0}
                  onChange={e => patch({ bandwidthRps: Number(e.target.value) || undefined })}
                  className={inputCls} />
              </div>
              <span className="text-[9px] text-app-text-3">req/s</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-app-text-3 font-medium">Latency add</span>
              <div className="flex items-center gap-1">
                <input type="number" value={edge.latencyMs ?? 0} min={0}
                  onChange={e => patch({ latencyMs: Number(e.target.value) || undefined })}
                  className={inputCls} />
              </div>
              <span className="text-[9px] text-app-text-3">ms</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-app-text-3 font-medium">Weight</span>
              <input type="number" value={edge.weight ?? 1} min={1} max={100}
                onChange={e => patch({ weight: Number(e.target.value) })}
                className={inputCls} />
              <span className="text-[9px] text-app-text-3">relative</span>
            </div>
          </div>

          {/* Actions row */}
          <div className="flex items-center gap-2 pt-1">
            {/* Bidirectional toggle */}
            <button
              onClick={() => patch({ bidirectional: !edge.bidirectional })}
              className={[
                'flex items-center gap-1.5 flex-1 justify-center text-xs px-3 py-1.5 rounded-lg border transition-colors',
                edge.bidirectional
                  ? 'bg-app-accent/20 border-app-accent text-app-accent'
                  : 'border-app-border text-app-text-2 hover:border-app-accent/50 hover:text-app-text',
              ].join(' ')}
            >
              <ArrowLeftRight size={12} strokeWidth={2} />
              <span>{edge.bidirectional ? 'Bidirectional' : 'One-way'}</span>
            </button>

            {/* Delete */}
            <button
              onClick={() => runInAction(() => graphStore.disconnectEdge(edgeId))}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 size={12} strokeWidth={1.8} />
              <span>Delete</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  )
})

export default EdgeConfigPanel
