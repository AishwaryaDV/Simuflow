import { observer } from 'mobx-react-lite'
import { runInAction } from 'mobx'
import { Lightbulb } from 'lucide-react'
import { uiStore } from '../../stores/UIStore'

/**
 * Floating bulb button — visible when a template is loaded.
 * Clicking opens the templates sidebar (which auto-jumps to DetailsView).
 */
const TemplateBadge = observer(() => {
  if (!uiStore.templateMode) return null

  return (
    <button
      onClick={() => runInAction(() => uiStore.openTemplateDetails())}
      className="absolute right-6 top-1/2 -translate-y-1/2 z-50 w-11 h-11 flex items-center justify-center rounded-xl bg-yellow-400/15 border border-yellow-400/40 backdrop-blur-sm hover:bg-yellow-400/25 hover:border-yellow-400/70 transition-colors shadow-lg"
      title="View design explanation"
    >
      <Lightbulb size={18} className="text-yellow-300" />
    </button>
  )
})

export default TemplateBadge
