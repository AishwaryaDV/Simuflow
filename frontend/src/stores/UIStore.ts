import { makeObservable, observable, computed, action } from 'mobx'

type ActiveModal = 'share' | 'settings' | null

interface PanelState {
  left:      boolean
  right:     boolean
  bottom:    boolean
  chaos:     boolean
  templates: boolean
}

export type CanvasMode = 'select' | 'hand' | 'connect' | 'text' | 'eraser' | 'container'

// Read once synchronously so first render already has the right values — no flash.
const _persistedSlug = (() => {
  try { return localStorage.getItem('simuflow:template-slug') } catch { return null }
})()

class UIStore {
  panelState: PanelState = {
    left:      true,
    right:     false,
    bottom:    false,
    chaos:     false,
    // Auto-open sidebar on reload if a template was previously loaded
    templates: _persistedSlug !== null,
  }
  activeModal:        ActiveModal    = null
  theme:              'dark' | 'light' = 'light'
  onboardingComplete: boolean        = false
  canvasMode:         CanvasMode     = 'select'
  loadedTemplateSlug:   string | null  = _persistedSlug
  templateDetailsOpen:  boolean        = _persistedSlug !== null

  constructor() {
    makeObservable(this, {
      panelState:         observable,
      activeModal:        observable,
      theme:              observable,
      onboardingComplete: observable,
      canvasMode:          observable,
      loadedTemplateSlug:   observable,
      templateDetailsOpen:  observable,
      templateMode:         computed,
      togglePanel:        action,
      openPanel:          action,
      closePanel:         action,
      openModal:          action,
      closeModal:         action,
      setTheme:           action,
      completeOnboarding: action,
      setCanvasMode:       action,
      setLoadedTemplate:    action,
      openTemplateDetails:  action,
      closeTemplateDetails: action,
      showTemplatesList:    action,
    })
  }

  togglePanel(panel: keyof PanelState) {
    this.panelState[panel] = !this.panelState[panel]
  }

  openPanel(panel: keyof PanelState) {
    this.panelState[panel] = true
  }

  closePanel(panel: keyof PanelState) {
    this.panelState[panel] = false
  }

  openModal(modal: NonNullable<ActiveModal>) {
    this.activeModal = modal
  }

  closeModal() {
    this.activeModal = null
  }

  setTheme(theme: 'dark' | 'light') {
    this.theme = theme
  }

  completeOnboarding() {
    this.onboardingComplete = true
  }

  get templateMode(): boolean {
    return this.loadedTemplateSlug !== null
  }

  setCanvasMode(mode: CanvasMode) {
    this.canvasMode = mode
  }

  setLoadedTemplate(slug: string | null) {
    this.loadedTemplateSlug  = slug
    this.templateDetailsOpen = slug !== null
  }

  openTemplateDetails() {
    this.templateDetailsOpen = true
    this.panelState.templates = true
  }

  closeTemplateDetails() {
    this.templateDetailsOpen = false
  }

  /** Open the templates sidebar and always land on the list view. */
  showTemplatesList() {
    this.panelState.templates    = true
    this.templateDetailsOpen     = false
  }
}

export const uiStore = new UIStore()
