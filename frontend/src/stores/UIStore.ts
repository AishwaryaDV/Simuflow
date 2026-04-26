import { makeObservable, observable, computed, action } from 'mobx'

type ActiveModal = 'share' | 'settings' | null

interface ConfirmState {
  open:      boolean
  title:     string
  message:   string
  onConfirm: () => void
  danger:    boolean
}

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
    templates: false,
  }
  activeModal:        ActiveModal    = null
  theme:              'dark' | 'light' = 'light'
  onboardingComplete: boolean        = false
  canvasMode:         CanvasMode     = 'select'
  loadedTemplateSlug:   string | null  = _persistedSlug
  templateDetailsOpen:  boolean        = false
  confirm: ConfirmState = { open: false, title: '', message: '', onConfirm: () => {}, danger: false }
  toast:   { message: string; visible: boolean } = { message: '', visible: false }
  sidebarCollapsed: boolean = false

  constructor() {
    makeObservable(this, {
      panelState:         observable,
      activeModal:        observable,
      theme:              observable,
      onboardingComplete: observable,
      canvasMode:          observable,
      loadedTemplateSlug:   observable,
      templateDetailsOpen:  observable,
      confirm:              observable,
      toast:                observable,
      sidebarCollapsed:     observable,
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
      openConfirm:          action,
      closeConfirm:         action,
      showToast:            action,
      clearToast:           action,
      toggleSidebar:        action,
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

  openConfirm(title: string, message: string, onConfirm: () => void, danger = true) {
    this.confirm = { open: true, title, message, onConfirm, danger }
  }

  closeConfirm() {
    this.confirm = { ...this.confirm, open: false }
  }

  private _toastTimer: ReturnType<typeof setTimeout> | null = null

  showToast(message: string) {
    if (this._toastTimer) clearTimeout(this._toastTimer)
    this.toast = { message, visible: true }
    this._toastTimer = setTimeout(() => {
      this.clearToast()
    }, 3000)
  }

  clearToast() {
    this.toast = { ...this.toast, visible: false }
  }

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed
  }

  /** Open the templates sidebar and always land on the list view. */
  showTemplatesList() {
    this.panelState.templates    = true
    this.templateDetailsOpen     = false
  }
}

export const uiStore = new UIStore()
