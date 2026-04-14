import { observer } from 'mobx-react-lite'
import { runInAction } from 'mobx'
import { Lightbulb } from 'lucide-react'
import { uiStore } from '../../stores/UIStore'
import { TEMPLATES } from '../../templates/index'

/**
 * Floating canvas badge — visible when a template is loaded.
 * Shows the template name next to a bulb icon.
 * Clicking opens the templates sidebar (which auto-jumps to DetailsView).
 */
const TemplateBadge = observer(() => {
  if (!uiStore.templateMode || !uiStore.loadedTemplateSlug) return null

  const template = TEMPLATES.find(t => t.slug === uiStore.loadedTemplateSlug)
  if (!template) return null

  const handleClick = () => {
    runInAction(() => uiStore.openPanel('templates'))
  }

  return (
    <button
      onClick={handleClick}
      className="absolute top-3 left-3 z-10 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-app-surface/90 border border-app-border backdrop-blur-sm hover:border-yellow-400/50 hover:bg-app-elevated/90 transition-colors group shadow-sm"
      title="View design explanation"
    >
      <Lightbulb size={13} className="text-yellow-400 shrink-0" />
      <span className="text-xs font-medium text-app-text-2 group-hover:text-app-text transition-colors">
        {template.name}
      </span>
    </button>
  )
})

export default TemplateBadge
