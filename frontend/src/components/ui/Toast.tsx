import { observer } from 'mobx-react-lite'
import { uiStore } from '../../stores/UIStore'

const Toast = observer(() => {
  if (!uiStore.toast.visible) return null

  return (
    <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none">
      <div className="bg-app-elevated border border-app-border rounded-xl px-4 py-2.5 shadow-2xl shadow-black/60 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-app-text-3 shrink-0" />
        <p className="text-xs font-medium text-app-text-2 whitespace-nowrap">
          {uiStore.toast.message}
        </p>
      </div>
    </div>
  )
})

export default Toast
