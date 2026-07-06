import { makeObservable, observable, action, computed, runInAction } from 'mobx'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

class AuthStore {
  session: Session | null = null
  user: User | null       = null
  loading                 = true
  modalOpen               = false
  resetPasswordMode       = false
  /** Action queued by requireAuth — runs automatically after a successful sign-in. */
  private _pendingAction: (() => void) | null = null

  constructor() {
    makeObservable(this, {
      session:           observable,
      user:              observable,
      loading:           observable,
      modalOpen:         observable,
      resetPasswordMode: observable,
      isAuthenticated:   computed,
      setSession:        action,
      openModal:         action,
      closeModal:        action,
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      runInAction(() => {
        this.setSession(session)
        this.loading = false
      })
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      runInAction(() => {
        this.setSession(session)
        if (_event === 'PASSWORD_RECOVERY') {
          this.resetPasswordMode = true
          this.modalOpen = true
        } else if (session) {
          this.modalOpen = false
        }
      })
      // Resume the action that triggered the auth gate (Save / Share / Fork)
      if (_event === 'SIGNED_IN' && this._pendingAction) {
        const action = this._pendingAction
        this._pendingAction = null
        setTimeout(action, 0)
      }
    })
  }

  get isAuthenticated() {
    return !!this.session
  }

  setSession(session: Session | null) {
    this.session = session
    this.user    = session?.user ?? null
  }

  openModal() {
    this.modalOpen = true
  }

  closeModal() {
    this.modalOpen = false
    this._pendingAction = null // user dismissed — drop the queued action
  }

  // Call this from Save/Share/etc to gate behind auth.
  // If the user signs in from the modal, the callback runs automatically.
  requireAuth(callback: () => void) {
    if (this.isAuthenticated) {
      callback()
    } else {
      this._pendingAction = callback
      this.openModal()
    }
  }

  async signInWithEmail(email: string, password: string): Promise<string | null> {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error?.message ?? null
  }

  async signUpWithEmail(email: string, password: string): Promise<string | null> {
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: window.location.origin },
    })
    return error?.message ?? null
  }

  async sendPasswordReset(email: string): Promise<string | null> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    return error?.message ?? null
  }

  async updatePassword(newPassword: string): Promise<string | null> {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (!error) runInAction(() => { this.resetPasswordMode = false })
    return error?.message ?? null
  }

  async signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      // Keep the current page (e.g. /shared/:token) — origin alone would
      // dump the user back at the workspace after the OAuth round-trip.
      options:  { redirectTo: window.location.origin + window.location.pathname },
    })
  }

  async signOut() {
    await supabase.auth.signOut()
  }

  get avatarInitials() {
    const email = this.user?.email ?? ''
    return email.charAt(0).toUpperCase() || '?'
  }
}

export const authStore = new AuthStore()
