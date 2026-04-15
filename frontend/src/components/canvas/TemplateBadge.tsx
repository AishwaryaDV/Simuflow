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
      className="absolute right-3 top-1/2 -translate-y-1/2 z-50 w-8 h-8 flex items-center justify-center rounded-lg bg-app-surface/90 border border-app-border backdrop-blur-sm hover:border-yellow-400/60 hover:bg-yellow-400/10 transition-colors shadow-sm"
      title="View design explanation"
    >
      <Lightbulb size={15} className="text-yellow-400" />
    </button>
  )
})

export default TemplateBadge
