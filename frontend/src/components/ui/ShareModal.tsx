import { useEffect, useRef, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { X, Link2, Copy, Check, Loader2, EyeOff } from 'lucide-react'
import { api } from '../../lib/api'
import { diagramStore } from '../../stores/DiagramStore'

interface ShareModalProps {
  open:     boolean
  onClose:  () => void
}

const ShareModal = observer(({ open, onClose }: ShareModalProps) => {
  const [shareUrl, setShareUrl]   = useState<string | null>(null)
  const [loading, setLoading]     = useState(false)
  const [revoking, setRevoking]   = useState(false)
  const [copied, setCopied]       = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const inputRef                  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open || !diagramStore.currentDiagramId) return
    setLoading(true)
    setError(null)
    api.diagrams.share(diagramStore.currentDiagramId)
      .then(res => {
        // Build URL using current origin so it always matches the deployed frontend
        const token = res.shareToken
        setShareUrl(`${window.location.origin}/shared/${token}`)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [open])

  const handleCopy = () => {
    if (!shareUrl) return
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRevoke = async () => {
    if (!diagramStore.currentDiagramId) return
    setRevoking(true)
    try {
      await api.diagrams.unshare(diagramStore.currentDiagramId)
      onClose()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setRevoking(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-app-surface border border-app-border rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-app-border">
          <div className="flex items-center gap-2">
            <Link2 size={15} className="text-app-accent" />
            <span className="text-sm font-semibold text-app-text">Share diagram</span>
          </div>
          <button onClick={onClose} className="text-app-text-3 hover:text-app-text transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 flex flex-col gap-4">
          {error && (
            <div className="text-xs text-red-400 bg-red-950/40 border border-red-500/30 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={20} className="animate-spin text-app-text-3" />
            </div>
          ) : shareUrl ? (
            <>
              <p className="text-xs text-app-text-2">
                Anyone with this link can view and fork your diagram.
              </p>

              {/* Link row */}
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  readOnly
                  value={shareUrl}
                  onClick={() => inputRef.current?.select()}
                  className="flex-1 text-xs bg-app-elevated border border-app-border rounded-lg px-3 py-2 text-app-text-2 focus:outline-none cursor-text truncate"
                />
                <button
                  onClick={handleCopy}
                  className={[
                    'flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border transition-colors shrink-0 font-medium',
                    copied
                      ? 'border-green-500/40 text-green-400 bg-green-500/10'
                      : 'border-app-accent/50 text-app-accent hover:bg-app-accent/10',
                  ].join(' ')}
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>

              {/* Revoke */}
              <button
                onClick={handleRevoke}
                disabled={revoking}
                className="flex items-center gap-1.5 text-xs text-app-text-3 hover:text-red-400 transition-colors disabled:opacity-50 w-fit"
              >
                {revoking ? <Loader2 size={12} className="animate-spin" /> : <EyeOff size={12} />}
                Make private (revoke link)
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
})

export default ShareModal
