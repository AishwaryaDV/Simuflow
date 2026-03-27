import { makeObservable, observable, action } from 'mobx'

type ActiveModal = 'share' | 'preset' | 'settings' | null

interface PanelState {
  left:   boolean
  right:  boolean
  bottom: boolean
  chaos:  boolean
}

class UIStore {
  panelState: PanelState = {
    left:   true,
    right:  false,
    bottom: false,
    chaos:  false,
  }
  activeModal:        ActiveModal    = null
  theme:              'dark' | 'light' = 'dark'
  onboardingComplete: boolean        = false

  constructor() {
    makeObservable(this, {
      panelState:         observable,
      activeModal:        observable,
      theme:              observable,
      onboardingComplete: observable,
      togglePanel:        action,
      openPanel:          action,
      closePanel:         action,
      openModal:          action,
      closeModal:         action,
      setTheme:           action,
      completeOnboarding: action,
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
}

export const uiStore = new UIStore()
