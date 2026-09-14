import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  Check,
  Eye,
  EyeOff,
  Film,
  Gamepad2,
  Loader2,
  Tv,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import Brand from '../components/brand/Brand'
import VerdictMark from '../features/verdict/VerdictMark'
import { VERDICTS } from '../features/verdict/verdictModel'

type AuthMode = 'signin' | 'signup' | 'forgot'
const copy = {
  signin: {
    title: 'Welcome back.',
    detail: 'Your next great conversation starts here.',
    action: 'Take your seat',
  },
  signup: {
    title: 'There’s a seat for you.',
    detail: 'Start a collection. Find your people. Share the good stuff.',
    action: 'Create your account',
  },
  forgot: {
    title: 'Let’s get you back in.',
    detail: 'We’ll send a password reset link to your email.',
    action: 'Send reset link',
  },
}

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [username, setUsername] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const {
    signIn,
    signUp,
    resetPasswordForEmail,
    sessionExpired,
    clearSessionExpired,
  } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const checks = [
    { label: '8+ characters', valid: password.length >= 8 },
    { label: 'Uppercase', valid: /[A-Z]/.test(password) },
    { label: 'Lowercase', valid: /[a-z]/.test(password) },
    { label: 'A number', valid: /[0-9]/.test(password) },
  ]
  useEffect(() => () => clearSessionExpired(), [clearSessionExpired])
  const switchMode = (value: AuthMode) => {
    setMode(value)
    setError('')
    setMessage('')
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (busy) return
    setError('')
    setMessage('')
    if (mode === 'signup') {
      if (!/^[a-z0-9_]{3,30}$/.test(username)) {
        setError(
          'Choose a username with 3–30 lowercase letters, numbers, or underscores.'
        )
        return
      }
      if (checks.some((check) => !check.valid)) {
        setError('Please meet each password requirement below.')
        return
      }
      if (password !== confirmation) {
        setError('Your passwords don’t match yet.')
        return
      }
    }
    setBusy(true)
    try {
      if (mode === 'forgot') {
        await resetPasswordForEmail(email.trim())
        setMessage('Check your inbox for a link to reset your password.')
      } else {
        if (mode === 'signup') {
          const result = await signUp(email.trim(), password, username)
          if (result === 'confirmation-required') {
            setMessage(
              'You’re on the list! Check your email to confirm your account, then sign in.'
            )
            return
          }
        } else await signIn(email.trim(), password)
        const from = (location.state as { from?: string } | null)?.from
        navigate(
          from?.startsWith('/') && !from.startsWith('//') ? from : '/feed',
          { replace: true }
        )
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'We couldn’t connect. Please try again.'
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-brand">
        <Brand />
      </div>
      <div className="auth-layout">
        <section className="auth-story" aria-label="Welcome to Popcorn Pal">
          <h1>
            For the love
            <br />
            of a <em>good story.</em>
          </h1>
          <div className="auth-categories" aria-hidden="true">
            <span>
              <Film size={15} /> Movies
            </span>
            <span>
              <Tv size={15} /> Shows
            </span>
            <span>
              <Gamepad2 size={15} /> Games
            </span>
            <span>
              <BookOpen size={15} /> Books
            </span>
          </div>
          {/* The app's own rating vocabulary, as the desktop flourish: the
              six verdicts everyone here rates with, from a golden bucket to
              the dumpster. */}
          <div className="auth-scale" aria-hidden="true">
            <p className="auth-scale-eyebrow">Every title gets a verdict</p>
            <ol className="auth-scale-list">
              {VERDICTS.map((verdict) => (
                <li key={verdict.id}>
                  <VerdictMark verdict={verdict.id} size={56} />
                  <span>{verdict.name}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="auth-form-panel" aria-labelledby="auth-heading">
          <h2 id="auth-heading">{copy[mode].title}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            {copy[mode].detail}
          </p>

          {sessionExpired && (
            <p role="status" className="app-note app-note-warn mt-4">
              Your session ended. Sign in to pick up where you left off.
            </p>
          )}

          {mode !== 'forgot' && (
            <div
              className="app-segmented mt-5"
              role="group"
              aria-label="Sign in or create an account"
            >
              {(['signin', 'signup'] as const).map((value) => (
                <button
                  disabled={busy}
                  type="button"
                  key={value}
                  aria-pressed={value === mode}
                  onClick={() => switchMode(value)}
                >
                  {value === 'signin' ? 'Sign in' : 'Create account'}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={submit} className="mt-5 space-y-4">
            {mode === 'signup' && (
              <div>
                <label htmlFor="username" className="app-label">
                  Username
                </label>
                <input
                  id="username"
                  className="app-input"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  enterKeyHint="next"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  placeholder="your_screen_name"
                  required
                  minLength={3}
                  maxLength={30}
                />
                <p className="mt-2 text-xs text-muted">
                  Lowercase letters, numbers, and underscores.
                </p>
              </div>
            )}
            <div>
              <label htmlFor="email" className="app-label">
                Email address
              </label>
              <input
                id="email"
                className="app-input"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                enterKeyHint={mode === 'forgot' ? 'send' : 'next'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            {mode !== 'forgot' && (
              <div>
                <div className="mb-1 flex items-center justify-between gap-3">
                  <label htmlFor="password" className="app-label !mb-0">
                    Password
                  </label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => switchMode('forgot')}
                      className="app-button-ghost app-button-sm -mr-3 text-butter-300 hover:text-butter-300"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="password"
                    className="app-input pr-14"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={
                      mode === 'signin' ? 'current-password' : 'new-password'
                    }
                    enterKeyHint={mode === 'signin' ? 'go' : 'next'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      mode === 'signup' ? 'Make it a good one' : 'Your password'
                    }
                    required
                    minLength={mode === 'signup' ? 8 : 6}
                  />
                  <button
                    type="button"
                    className="app-icon-button absolute right-1 top-1/2 -translate-y-1/2"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={
                      showPassword ? 'Hide password' : 'Show password'
                    }
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {mode === 'signup' && (
                  <ul className="mt-3 flex flex-wrap gap-2" aria-label="Password requirements">
                    {checks.map((check) => (
                      <li
                        key={check.label}
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${
                          check.valid
                            ? 'border-ok/40 bg-ok/10 text-ok'
                            : 'border-line-soft text-muted'
                        }`}
                      >
                        <Check
                          size={12}
                          strokeWidth={3}
                          className={check.valid ? '' : 'opacity-30'}
                        />
                        {check.label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {mode === 'signup' && (
              <div>
                <label htmlFor="confirm-password" className="app-label">
                  Confirm password
                </label>
                <input
                  id="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  className="app-input"
                  autoComplete="new-password"
                  enterKeyHint="go"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  placeholder="One more time"
                  required
                />
              </div>
            )}
            {error && (
              <p role="alert" className="app-note app-note-danger">
                {error}
              </p>
            )}
            {message && (
              <p role="status" className="app-note app-note-ok">
                {message}
              </p>
            )}
            <button
              disabled={busy || !!message}
              type="submit"
              className="app-button-primary w-full !mt-6"
            >
              {busy ? (
                <Loader2 className="animate-spin" size={18} aria-hidden="true" />
              ) : null}
              {copy[mode].action}
              {!busy && <ArrowRight size={17} aria-hidden="true" />}
            </button>
          </form>

          {mode === 'forgot' ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => switchMode('signin')}
              className="app-button-ghost mt-3 w-full"
            >
              Back to sign in
            </button>
          ) : null}
          {mode === 'signup' && message && (
            <button
              className="app-button-secondary mt-3 w-full"
              onClick={() => switchMode('signin')}
            >
              Continue to sign in
            </button>
          )}
        </section>
      </div>
    </main>
  )
}
