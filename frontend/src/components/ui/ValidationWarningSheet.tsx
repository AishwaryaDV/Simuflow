/**
 * ValidationWarningSheet.tsx
 * Soft-block sheet — shown when topology has warnings.
 * User can override with "Run anyway" or dismiss to fix first.
 */

import { observer } from 'mobx-react-lite'
import { runInAction } from 'mobx'
import { AlertTriangle, X } from 'lucide-react'
import { validationStore } from '../../stores/ValidationStore'
import { graphStore } from '../../stores/GraphStore'
import type { ValidationIssue } from '../../validation/types'

const ValidationWarningSheet = observer(() => {
  if (!validationStore.showWarningSheet || !validationStore.report) return null

  const { warnings } = validationStore.report

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onMouseDown={() => runInAction(() => validationStore.closeWarningSheet())}
    >
      <div
        className="w-full max-w-lg bg-app-surface border border-yellow-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-yellow-500/20 bg-yellow-500/5">
          <AlertTriangle size={17} className="text-yellow-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-yellow-300">Review before running</p>
            <p className="text-[11px] text-yellow-400/70 mt-0.5">
              {warnings.length} warning{warnings.length !== 1 ? 's' : ''} — simulation may produce misleading results
            </p>
          </div>
          <button
            onClick={() => runInAction(() => validationStore.closeWarningSheet())}
            className="p-1 rounded text-app-text-3 hover:text-app-text hover:bg-app-elevated transition-colors shrink-0"
          >
            <X size={14} />
          </button>
        </div>

        {/* Warning list */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3 max-h-[50vh]">
          {warnings.map((issue: ValidationIssue, i: number) => {
            const nodeLabels = issue.affectedNodeIds
              .map((id: string) => graphStore.nodes.get(id)?.label ?? id)
              .filter(Boolean)
            return (
              <div
                key={i}
                className="flex gap-3 p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/20"
              >
                <div className="w-1.5 shrink-0 rounded-full bg-yellow-500/60 self-stretch" />
                <div className="flex flex-col gap-1 min-w-0">
                  <p className="text-xs font-semibold text-yellow-300">{issue.title}</p>
                  <p className="text-[11px] text-app-text-2 leading-relaxed">{issue.message}</p>
                  {nodeLabels.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {nodeLabels.map((label: string) => (
                        <span
                          key={label}
                          className="text-[10px] font-medium bg-yellow-500/15 text-yellow-300 border border-yellow-500/30 rounded-full px-2 py-0.5"
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
        <div className="px-5 py-4 border-t border-app-border flex items-center justify-between gap-3">
          <p className="text-[11px] text-app-text-3 leading-relaxed">
            Flagged nodes will show a yellow indicator during the run.
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => runInAction(() => validationStore.closeWarningSheet())}
              className="text-xs font-medium px-3 py-2 rounded-lg border border-app-border text-app-text-2 hover:text-app-text hover:bg-app-elevated transition-colors"
            >
              Fix first
            </button>
            <button
              onClick={() => runInAction(() => validationStore.proceedWithWarnings())}
              className="text-xs font-semibold px-4 py-2 rounded-lg bg-app-accent hover:bg-app-accent-dim text-white transition-colors"
            >
              Run anyway
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})

export default ValidationWarningSheet
