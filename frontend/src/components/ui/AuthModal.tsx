import { useState } from 'react'
import { observer } from 'mobx-react-lite'
import { X, Eye, EyeOff } from 'lucide-react'
import { authStore } from '../../stores/AuthStore'

type Tab = 'signin' | 'signup' | 'forgot'

const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
)


const AuthModal = observer(() => {
  const [tab, setTab]               = useState<Tab>('signin')
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [newPassword, setNewPassword]   = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [info, setInfo]             = useState<string | null>(null)
  const [loading, setLoading]       = useState(false)

  if (!authStore.modalOpen) return null

  const reset = () => { setError(null); setInfo(null) }

  const handleTabChange = (t: Tab) => { setTab(t); reset() }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) { setError('Please fill in all fields.'); return }
    setLoading(true)
    reset()

    const err = tab === 'signin'
      ? await authStore.signInWithEmail(email, password)
      : await authStore.signUpWithEmail(email, password)

    setLoading(false)
    if (err) {
      setError(err)
    } else if (tab === 'signup') {
      setInfo('Account created! Check your email to confirm before signing in.')
    }
  }

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) { setError('Please enter your email.'); return }
    setLoading(true)
    reset()
    const err = await authStore.sendPasswordReset(email)
    setLoading(false)
    if (err) setError(err)
    else setInfo('Reset link sent! Check your email.')
  }

  const handleNewPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassword || newPassword.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true)
    reset()
    const err = await authStore.updatePassword(newPassword)
    setLoading(false)
    if (err) setError(err)
  }

  const isResetMode = authStore.resetPasswordMode

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) authStore.closeModal() }}
    >
      <div className="bg-app-surface border border-app-border rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-app-accent flex items-center justify-center text-white text-sm font-bold select-none">S</div>
              <span className="text-sm font-semibold text-app-text">SimuFlow</span>
            </div>
            <button
              onClick={() => authStore.closeModal()}
              className="text-app-text-3 hover:text-app-text transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Tabs — hidden in forgot/reset modes */}
          {!isResetMode && tab !== 'forgot' && (
            <div className="flex bg-app-elevated rounded-lg p-1 gap-1">
              {(['signin', 'signup'] as Tab[]).map(t => (
                <button
                  key={t}
                  onClick={() => handleTabChange(t)}
                  className={[
                    'flex-1 text-xs font-medium py-1.5 rounded-md transition-colors',
                    tab === t
                      ? 'bg-app-surface text-app-text shadow-sm'
                      : 'text-app-text-3 hover:text-app-text-2',
                  ].join(' ')}
                >
                  {t === 'signin' ? 'Sign in' : 'Sign up'}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="px-6 pb-6 flex flex-col gap-3">

          {/* Error / Info */}
          {error && (
            <div className="text-xs text-red-400 bg-red-950/40 border border-red-500/30 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          {info && (
            <div className="text-xs text-green-400 bg-green-950/40 border border-green-500/30 rounded-lg px-3 py-2">
              {info}
            </div>
          )}

          {/* Set new password — shown after clicking reset link in email */}
          {isResetMode ? (
            <form onSubmit={handleNewPasswordSubmit} className="flex flex-col gap-2.5">
              <p className="text-xs text-app-text-3 mb-1">Enter your new password.</p>
              <input
                type="password"
                placeholder="New password (min 6 chars)"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full text-sm bg-app-elevated border border-app-border rounded-lg px-3 py-2 text-app-text placeholder:text-app-text-3 focus:outline-none focus:ring-1 focus:ring-app-accent"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full text-xs font-bold py-2 rounded-lg bg-app-accent hover:bg-app-accent-dim text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors tracking-wide"
              >
                {loading ? 'Please wait…' : 'Set new password'}
              </button>
            </form>

          ) : tab === 'forgot' ? (
            /* Forgot password view */
            <form onSubmit={handleForgotSubmit} className="flex flex-col gap-2.5">
              <p className="text-xs text-app-text-3 mb-1">Enter your email and we'll send a reset link.</p>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                className="w-full text-sm bg-app-elevated border border-app-border rounded-lg px-3 py-2 text-app-text placeholder:text-app-text-3 focus:outline-none focus:ring-1 focus:ring-app-accent"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full text-xs font-bold py-2 rounded-lg bg-app-accent hover:bg-app-accent-dim text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors tracking-wide"
              >
                {loading ? 'Please wait…' : 'Send reset link'}
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('signin')}
                className="text-xs text-app-text-3 hover:text-app-text text-center transition-colors"
              >
                ← Back to sign in
              </button>
            </form>

          ) : (
            /* Sign in / Sign up view */
            <>
              <button
                onClick={() => authStore.signInWithGoogle()}
                className="flex items-center justify-center gap-2.5 w-full text-xs font-bold py-2 px-4 rounded-lg border border-app-border bg-app-elevated hover:bg-app-surface transition-colors text-app-text tracking-wide"
              >
                <GoogleIcon />
                Continue with Google
              </button>

              <div className="flex items-center gap-3 my-1">
                <div className="h-px flex-1 bg-app-border" />
                <span className="text-[11px] text-app-text-3">or</span>
                <div className="h-px flex-1 bg-app-border" />
              </div>

              <form onSubmit={handleEmailSubmit} className="flex flex-col gap-2.5">
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  className="w-full text-sm bg-app-elevated border border-app-border rounded-lg px-3 py-2 text-app-text placeholder:text-app-text-3 focus:outline-none focus:ring-1 focus:ring-app-accent"
                />
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
                    className="w-full text-sm bg-app-elevated border border-app-border rounded-lg px-3 py-2 pr-9 text-app-text placeholder:text-app-text-3 focus:outline-none focus:ring-1 focus:ring-app-accent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-app-text-3 hover:text-app-text transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full text-xs font-bold py-2 rounded-lg bg-app-accent hover:bg-app-accent-dim text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-1 tracking-wide"
                >
                  {loading ? 'Please wait…' : tab === 'signin' ? 'Sign in' : 'Create account'}
                </button>
              </form>

              {tab === 'signin' && (
                <button
                  type="button"
                  onClick={() => handleTabChange('forgot')}
                  className="text-xs text-app-text-3 hover:text-app-text text-center transition-colors -mt-1"
                >
                  Forgot password?
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
})

export default AuthModal
