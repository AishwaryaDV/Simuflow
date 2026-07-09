import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import {
  ArrowLeft, User, LogOut, KeyRound, Loader2, Check, AlertTriangle,
} from 'lucide-react'
import { authStore } from '../stores/AuthStore'

const inputCls =
  'text-sm border border-app-border bg-app-elevated text-app-text rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-1 focus:ring-app-accent transition-colors'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-app-border bg-app-surface overflow-hidden">
      <h2 className="text-xs font-bold uppercase tracking-widest text-app-text-3 px-5 pt-4 pb-2">{title}</h2>
      <div className="px-5 pb-5 space-y-4">{children}</div>
    </section>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-app-text-2 shrink-0">{label}</span>
      <span className="text-sm text-app-text font-medium truncate text-right">{value}</span>
    </div>
  )
}

const ChangePasswordForm = observer(() => {
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPw.length < 6) { setResult({ ok: false, msg: 'Password must be at least 6 characters.' }); return }
    if (newPw !== confirmPw) { setResult({ ok: false, msg: 'Passwords do not match.' }); return }
    setSaving(true)
    setResult(null)
    const err = await authStore.updatePassword(newPw)
    setSaving(false)
    if (err) { setResult({ ok: false, msg: err }) }
    else { setResult({ ok: true, msg: 'Password updated.' }); setNewPw(''); setConfirmPw('') }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="text-xs text-app-text-2 mb-1 block">New password</label>
        <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
          className={inputCls} placeholder="At least 6 characters" autoComplete="new-password" />
      </div>
      <div>
        <label className="text-xs text-app-text-2 mb-1 block">Confirm password</label>
        <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
          className={inputCls} placeholder="Re-enter password" autoComplete="new-password" />
      </div>
      {result && (
        <p className={`text-xs flex items-center gap-1.5 ${result.ok ? 'text-green-400' : 'text-red-400'}`}>
          {result.ok ? <Check size={12} /> : <AlertTriangle size={12} />}
          {result.msg}
        </p>
      )}
      <button type="submit" disabled={saving || !newPw}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-app-accent hover:bg-app-accent-dim text-white disabled:opacity-40 transition-colors">
        {saving ? <Loader2 size={12} className="animate-spin" /> : <KeyRound size={12} />}
        Update password
      </button>
    </form>
  )
})

const SettingsPage = observer(() => {
  const navigate = useNavigate()
  const user = authStore.user
  const provider = user?.app_metadata?.provider ?? 'email'
  const isOAuth = provider !== 'email'

  if (!authStore.isAuthenticated) {
    return (
      <div className="min-h-screen bg-app-bg flex flex-col items-center justify-center gap-4 p-8">
        <User size={32} className="text-app-text-3" />
        <p className="text-sm text-app-text-2">Sign in to view your account settings.</p>
        <button onClick={() => navigate('/')}
          className="text-xs text-app-accent hover:underline">Back to workspace</button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-app-bg flex flex-col">
      {/* Header */}
      <header className="h-12 flex items-center px-4 gap-3 bg-app-surface border-b border-app-border shrink-0">
        <button onClick={() => navigate('/')}
          className="flex items-center gap-2 text-app-text-3 hover:text-app-text transition-colors">
          <ArrowLeft size={16} />
          <span className="text-xs font-medium">Back to workspace</span>
        </button>
        <div className="flex-1" />
        <span className="text-xs text-app-text-3">Settings</span>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center py-10 px-6">
        <div className="w-full max-w-md space-y-5">
          {/* Avatar + name */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-app-accent flex items-center justify-center text-white text-xl font-bold select-none shrink-0">
              {authStore.avatarInitials}
            </div>
            <div className="min-w-0">
              <p className="text-base font-semibold text-app-text truncate">
                {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
              </p>
              <p className="text-xs text-app-text-3 truncate">{user?.email}</p>
            </div>
          </div>

          {/* Account info */}
          <Section title="Account">
            <InfoRow label="Email" value={user?.email ?? '—'} />
            <InfoRow label="Auth provider" value={isOAuth ? `Google (${provider})` : 'Email / password'} />
            <InfoRow label="Account created" value={user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'} />
          </Section>

          {/* Password (only for email auth) */}
          {!isOAuth && (
            <Section title="Change password">
              <ChangePasswordForm />
            </Section>
          )}

          {/* Sign out */}
          <Section title="Session">
            <button onClick={async () => { await authStore.signOut(); navigate('/') }}
              className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors">
              <LogOut size={14} />
              Sign out
            </button>
          </Section>
        </div>
      </div>
    </div>
  )
})

export default SettingsPage
