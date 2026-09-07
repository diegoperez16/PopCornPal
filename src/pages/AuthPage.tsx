import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Check,
  Clapperboard,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import Brand from '../components/brand/Brand'

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
          <p className="auth-description">
            Movies, shows, games, and books — logged, rated, and shared with
            friends who get it.
          </p>
          <div className="cinema-ticket" aria-hidden="true">
            <div className="ticket-sky">
              <span className="ticket-orbit" />
              <span className="ticket-sun" />
              <div className="ticket-hills" />
              <div className="ticket-art-caption">
                <span>POPCORN PAL PRESENTS</span>
                <strong>
                  Your next
                  <br />
                  obsession.
                </strong>
                <small>WATCH · LOG · SHARE · REPEAT</small>
              </div>
            </div>
            <div className="ticket-stub">
              <span>ADMIT ONE</span>
              <Clapperboard size={27} strokeWidth={1.2} />
              <span>GOOD COMPANY INCLUDED</span>
            </div>
          </div>
        </section>
        <section className="auth-form-panel">
          <h2 className="text-[30px] font-semibold tracking-[-1px] leading-tight mb-7">
            {copy[mode].title}
          </h2>
          {mode === 'forgot' && (
            <p className="app-muted text-sm -mt-4 mb-7 leading-relaxed">
              {copy[mode].detail}
            </p>
          )}
          {sessionExpired && (
            <p
              role="status"
              className="mb-4 rounded-xl bg-amber-500/10 p-3 text-sm text-amber-200"
            >
              Your session ended. Sign in to pick up where you left off.
            </p>
          )}
          {mode !== 'forgot' && (
            <div className="grid grid-cols-2 gap-1 mb-6 rounded-xl border border-white/10 p-1 bg-[#111214]">
              {(['signin', 'signup'] as const).map((value) => (
                <button
                  disabled={busy}
                  type="button"
                  key={value}
                  aria-pressed={value === mode}
                  onClick={() => switchMode(value)}
                  className={`min-h-11 rounded-lg text-sm font-semibold ${mode === value ? 'bg-gray-700 text-gray-50' : 'text-gray-400'}`}
                >
                  {value === 'signin' ? 'Sign in' : 'Create account'}
                </button>
              ))}
            </div>
          )}
          <form onSubmit={submit} className="space-y-5">
            {mode === 'signup' && (
              <div>
                <label htmlFor="username" className="auth-label">
                  Username
                </label>
                <input
                  id="username"
                  className="app-input"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  placeholder="your_screen_name"
                  required
                  minLength={3}
                  maxLength={30}
                />
                <p className="mt-2 text-xs text-gray-400">
                  Lowercase letters, numbers, and underscores.
                </p>
              </div>
            )}
            <div>
              <label htmlFor="email" className="auth-label">
                Email address
              </label>
              <input
                id="email"
                className="app-input"
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            {mode !== 'forgot' && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor="password" className="text-sm font-medium">
                    Password
                  </label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => switchMode('forgot')}
                      className="text-xs text-[#d9bfb1] min-h-6"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="password"
                    className="app-input pr-12"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={
                      mode === 'signin' ? 'current-password' : 'new-password'
                    }
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
                    className="app-icon-button absolute right-1 top-1"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={
                      showPassword ? 'Hide password' : 'Show password'
                    }
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {mode === 'signup' && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {checks.map((check) => (
                      <span
                        key={check.label}
                        className={`text-xs flex gap-1 items-center ${check.valid ? 'text-[#c7dbb1]' : 'text-gray-400'}`}
                      >
                        <Check
                          size={12}
                          className={check.valid ? '' : 'opacity-30'}
                        />
                        {check.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
            {mode === 'signup' && (
              <div>
                <label htmlFor="confirm-password" className="auth-label">
                  Confirm password
                </label>
                <input
                  id="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  className="app-input"
                  autoComplete="new-password"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  placeholder="One more time"
                  required
                />
              </div>
            )}
            {error && (
              <p
                role="alert"
                className="rounded-xl border border-rose-400/25 bg-rose-400/10 p-3 text-sm text-rose-200"
              >
                {error}
              </p>
            )}
            {message && (
              <p
                role="status"
                className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-3 text-sm text-emerald-200"
              >
                {message}
              </p>
            )}
            <button
              disabled={busy || !!message}
              type="submit"
              className="app-button-primary w-full"
            >
              {busy ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <>
                  {copy[mode].action}
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>
          {mode === 'forgot' ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => switchMode('signin')}
              className="mt-5 w-full min-h-11 text-sm text-gray-300"
            >
              Back to sign in
            </button>
          ) : (
            <p className="mt-6 text-center text-xs text-gray-400">
              A home for everything you watch, play, and read.
            </p>
          )}
          {mode === 'signup' && message && (
            <button
              className="mt-4 w-full min-h-11 text-sm text-[#ff9b84]"
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
