import { makeObservable, observable, action, computed, runInAction } from 'mobx'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

class AuthStore {
  session: Session | null = null
  user: User | null       = null
  loading                 = true
  modalOpen               = false

  constructor() {
    makeObservable(this, {
      session:         observable,
      user:            observable,
      loading:         observable,
      modalOpen:       observable,
      isAuthenticated: computed,
      setSession:      action,
      openModal:       action,
      closeModal:      action,
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
        if (session) this.modalOpen = false
      })
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
  }

  // Call this from Save/Share/etc to gate behind auth
  requireAuth(callback: () => void) {
    if (this.isAuthenticated) {
      callback()
    } else {
      this.openModal()
    }
  }

  async signInWithEmail(email: string, password: string): Promise<string | null> {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error?.message ?? null
  }

  async signUpWithEmail(email: string, password: string): Promise<string | null> {
    const { error } = await supabase.auth.signUp({ email, password })
    return error?.message ?? null
  }

  async signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options:  { redirectTo: window.location.origin },
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
