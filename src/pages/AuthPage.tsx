import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import { Check, X, Eye, EyeOff, Popcorn } from 'lucide-react'

export default function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const { signIn, signUp, resetPasswordForEmail, sessionExpired, clearSessionExpired } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => () => clearSessionExpired(), [clearSessionExpired])

  const getPasswordStrength = (pass: string) => {
    const checks = {
      length: pass.length >= 8,
      uppercase: /[A-Z]/.test(pass),
      lowercase: /[a-z]/.test(pass),
      number: /[0-9]/.test(pass),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(pass),
    }
    const strength = Object.values(checks).filter(Boolean).length
    return { strength, checks }
  }

  const validatePassword = (pass: string): string | null => {
    if (pass.length < 8) return 'At least 8 characters required'
    if (!/[A-Z]/.test(pass)) return 'Needs an uppercase letter'
    if (!/[a-z]/.test(pass)) return 'Needs a lowercase letter'
    if (!/[0-9]/.test(pass)) return 'Needs a number'
    return null
  }

  const validateUsername = (u: string): string | null => {
    if (u.length < 3) return 'Username must be at least 3 characters'
    if (u.length > 30) return 'Username must be under 30 characters'
    if (!/^[a-z0-9_]+$/.test(u)) return 'Lowercase letters, numbers, and underscores only'
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')

    if (mode === 'forgot') {
      if (!email) { setError('Please enter your email'); return }
      setLoading(true)
      try {
        await resetPasswordForEmail(email)
        setSuccessMsg('Check your email for the reset link.')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
      return
    }

    if (mode === 'signup') {
      const usernameError = validateUsername(username)
      if (usernameError) { setError(usernameError); return }
      const passwordError = validatePassword(password)
      if (passwordError) { setError(passwordError); return }
      if (password !== confirmPassword) { setError('Passwords do not match'); return }
    }

    setLoading(true)
    try {
      if (mode === 'signup') {
        await signUp(email, password, username.toLowerCase())
      } else {
        await signIn(email, password)
      }
      navigate('/profile')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const switchMode = (newMode: typeof mode) => {
    setMode(newMode)
    setError('')
    setSuccessMsg('')
  }

  const passwordStrength = getPasswordStrength(password)
  const passwordsMatch = password && confirmPassword && password === confirmPassword

  const inputClass = 'w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-white/20 focus:bg-white/[0.07] transition-colors'

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-pink-600 items-center justify-center shadow-lg shadow-red-500/20 mb-4">
            <Popcorn className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">PopcornPal</h1>
          <p className="text-sm text-gray-600 mt-1">
            {mode === 'forgot' ? 'Reset your password' : 'Track what you watch, play, and read'}
          </p>
        </div>

        {/* Session expired */}
        {sessionExpired && (
          <div className="mb-4 px-4 py-2.5 bg-yellow-500/8 border border-yellow-500/20 rounded-xl text-yellow-400/80 text-xs text-center">
            Your session expired — please sign in again.
          </div>
        )}

        {/* Mode tabs (sign in / sign up) */}
        {mode !== 'forgot' && (
          <div className="flex gap-1 p-1 bg-white/4 rounded-xl mb-6">
            {(['signin', 'signup'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                  mode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {m === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'signup' && (
            <div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                className={inputClass}
                placeholder="Username"
                required
              />
              <p className="mt-1.5 text-[11px] text-gray-700 px-1">
                3–30 characters · lowercase, numbers, underscores
              </p>
            </div>
          )}

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="Email"
            required={mode !== 'forgot'}
          />

          {mode !== 'forgot' && (
            <div className="space-y-3">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputClass} pr-11`}
                  placeholder="Password"
                  required
                  minLength={mode === 'signup' ? 8 : 6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {mode === 'signin' && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {/* Password strength (signup only) */}
              {mode === 'signup' && password && (
                <div className="space-y-2 px-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`h-0.5 flex-1 rounded-full transition-colors ${
                          level <= passwordStrength.strength
                            ? passwordStrength.strength <= 2 ? 'bg-red-500'
                              : passwordStrength.strength <= 3 ? 'bg-yellow-500'
                              : 'bg-green-500'
                            : 'bg-white/8'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {[
                      { key: 'length', label: '8+ chars' },
                      { key: 'uppercase', label: 'Uppercase' },
                      { key: 'lowercase', label: 'Lowercase' },
                      { key: 'number', label: 'Number' },
                    ].map(({ key, label }) => (
                      <div key={key} className={`flex items-center gap-1.5 text-[11px] ${passwordStrength.checks[key as keyof typeof passwordStrength.checks] ? 'text-green-500' : 'text-gray-700'}`}>
                        {passwordStrength.checks[key as keyof typeof passwordStrength.checks]
                          ? <Check className="w-3 h-3" />
                          : <X className="w-3 h-3" />
                        }
                        {label}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {mode === 'signup' && (
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`${inputClass} pr-11 ${
                  confirmPassword
                    ? passwordsMatch ? 'border-green-500/30' : 'border-red-500/30'
                    : ''
                }`}
                placeholder="Confirm password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              {confirmPassword && (
                <p className={`mt-1.5 text-[11px] px-1 flex items-center gap-1 ${passwordsMatch ? 'text-green-500' : 'text-gray-600'}`}>
                  {passwordsMatch ? <><Check className="w-3 h-3" /> Passwords match</> : 'Passwords don\'t match yet'}
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="px-3 py-2.5 bg-red-500/8 border border-red-500/20 rounded-xl text-red-400 text-xs">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="px-3 py-2.5 bg-green-500/8 border border-green-500/20 rounded-xl text-green-400 text-xs flex items-center gap-2">
              <Check className="w-3.5 h-3.5 flex-shrink-0" />
              {successMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (mode === 'forgot' && !!successMsg)}
            className="w-full bg-gradient-to-r from-red-500 to-pink-600 text-white font-semibold py-3 rounded-xl text-sm shadow-lg shadow-red-500/20 disabled:opacity-40 transition-opacity mt-1"
          >
            {loading
              ? 'Please wait…'
              : mode === 'signup' ? 'Create Account'
              : mode === 'forgot' ? 'Send Reset Link'
              : 'Sign In'}
          </button>
        </form>

        {mode === 'forgot' && (
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className="text-sm text-gray-600 hover:text-gray-300 transition-colors"
            >
              ← Back to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
