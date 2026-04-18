import { observer } from 'mobx-react-lite'
import { runInAction } from 'mobx'
import { uiStore } from '../../stores/UIStore'

const ConfirmDialog = observer(() => {
  const { open, title, message, onConfirm, danger } = uiStore.confirm
  if (!open) return null

  const handleConfirm = () => {
    runInAction(() => uiStore.closeConfirm())
    onConfirm()
  }

  const handleCancel = () => {
    runInAction(() => uiStore.closeConfirm())
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      onMouseDown={handleCancel}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

      {/* Dialog */}
      <div
        className="relative z-10 w-full max-w-md mx-4 bg-app-surface border border-app-border rounded-2xl shadow-2xl p-6 flex flex-col gap-5"
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-app-text">{title}</h2>
          <p className="text-xs text-app-text-2 leading-relaxed">{message}</p>
        </div>

        <div className="flex gap-2 justify-end">
          <button
            onClick={handleCancel}
            className="text-xs px-4 py-2 rounded-lg text-app-text-2 hover:text-app-text hover:bg-app-elevated transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className={[
              'text-xs px-4 py-2 rounded-lg font-medium transition-colors',
              danger
                ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
                : 'bg-app-accent/15 text-app-accent hover:bg-app-accent/25',
            ].join(' ')}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
})

export default ConfirmDialog
