/**
 * ValidationErrorModal.tsx
 * Hard-block modal — shown when topology has errors.
 * Simulation cannot start until all errors are resolved.
 */

import { observer } from 'mobx-react-lite'
import { runInAction } from 'mobx'
import { XCircle, X } from 'lucide-react'
import { validationStore } from '../../stores/ValidationStore'
import { graphStore } from '../../stores/GraphStore'

const ValidationErrorModal = observer(() => {
  if (!validationStore.showErrorModal || !validationStore.report) return null

  const { errors } = validationStore.report

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onMouseDown={() => runInAction(() => validationStore.dismissErrors())}
    >
      <div
        className="w-full max-w-lg bg-app-surface border border-red-500/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-red-500/20 bg-red-500/5">
          <XCircle size={18} className="text-red-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-300">Simulation blocked</p>
            <p className="text-[11px] text-red-400/70 mt-0.5">
              {errors.length} error{errors.length !== 1 ? 's' : ''} must be resolved before running
            </p>
          </div>
          <button
            onClick={() => runInAction(() => validationStore.dismissErrors())}
            className="p-1 rounded text-app-text-3 hover:text-app-text hover:bg-app-elevated transition-colors shrink-0"
          >
            <X size={14} />
          </button>
        </div>

        {/* Error list */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3 max-h-[60vh]">
          {errors.map((issue, i) => {
            const nodeLabels = issue.affectedNodeIds
              .map(id => graphStore.nodes.get(id)?.label ?? id)
              .filter(Boolean)
            return (
              <div
                key={i}
                className="flex gap-3 p-3 rounded-xl bg-red-500/5 border border-red-500/20"
              >
                <div className="w-1.5 shrink-0 rounded-full bg-red-500/60 self-stretch" />
                <div className="flex flex-col gap-1 min-w-0">
                  <p className="text-xs font-semibold text-red-300">{issue.title}</p>
                  <p className="text-[11px] text-app-text-2 leading-relaxed">{issue.message}</p>
                  {nodeLabels.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {nodeLabels.map(label => (
                        <span
                          key={label}
                          className="text-[10px] font-medium bg-red-500/15 text-red-300 border border-red-500/30 rounded-full px-2 py-0.5"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-app-border flex justify-end">
          <button
            onClick={() => runInAction(() => validationStore.dismissErrors())}
            className="text-xs font-medium px-4 py-2 rounded-lg bg-app-elevated hover:bg-app-elevated/80 border border-app-border text-app-text-2 hover:text-app-text transition-colors"
          >
            Fix issues
          </button>
        </div>
      </div>
    </div>
  )
})

export default ValidationErrorModal
