import { makeObservable, observable, action } from 'mobx'

type ActiveModal = 'share' | 'settings' | null

interface PanelState {
  left:      boolean
  right:     boolean
  bottom:    boolean
  chaos:     boolean
  templates: boolean
}

export type CanvasMode = 'select' | 'hand' | 'connect' | 'text' | 'eraser' | 'container'

class UIStore {
  panelState: PanelState = {
    left:      true,
    right:     false,
    bottom:    false,
    chaos:     false,
    templates: false,
  }
  activeModal:        ActiveModal    = null
  theme:              'dark' | 'light' = 'light'
  onboardingComplete: boolean        = false
  canvasMode:         CanvasMode     = 'select'
  templateMode:        boolean        = false
  loadedTemplateSlug:  string | null  = null

  constructor() {
    makeObservable(this, {
      panelState:         observable,
      activeModal:        observable,
      theme:              observable,
      onboardingComplete: observable,
      canvasMode:         observable,
      templateMode:        observable,
      loadedTemplateSlug:  observable,
      togglePanel:        action,
      openPanel:          action,
      closePanel:         action,
      openModal:          action,
      closeModal:         action,
      setTheme:           action,
      completeOnboarding: action,
      setCanvasMode:      action,
      setTemplateMode:    action,
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

  setCanvasMode(mode: CanvasMode) {
    this.canvasMode = mode
  }

  setTemplateMode(active: boolean, slug?: string) {
    this.templateMode       = active
    this.loadedTemplateSlug = active ? (slug ?? null) : null
  }
}

export const uiStore = new UIStore()
