import { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import { Check, X, Eye, EyeOff } from 'lucide-react'

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

  const { signIn, signUp, resetPasswordForEmail } = useAuthStore()
  const navigate = useNavigate()

  const getPasswordStrength = (pass: string) => {
    let strength = 0
    const checks = {
      length: pass.length >= 8,
      uppercase: /[A-Z]/.test(pass),
      lowercase: /[a-z]/.test(pass),
      number: /[0-9]/.test(pass),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(pass)
    }
    
    strength += checks.length ? 1 : 0
    strength += checks.uppercase ? 1 : 0
    strength += checks.lowercase ? 1 : 0
    strength += checks.number ? 1 : 0
    strength += checks.special ? 1 : 0

    return { strength, checks }
  }

  const getPasswordMatch = () => {
    if (!password || !confirmPassword) return null
    
    const minLength = Math.min(password.length, confirmPassword.length)
    let matching = 0
    
    for (let i = 0; i < minLength; i++) {
      if (password[i] === confirmPassword[i]) {
        matching++
      } else {
        break // Stop at first mismatch
      }
    }
    
    const matchPercentage = password.length > 0 ? (matching / password.length) * 100 : 0
    const lengthMatch = password.length === confirmPassword.length
    const fullMatch = password === confirmPassword && password.length >= 8
    
    return { matching, matchPercentage, lengthMatch, fullMatch }
  }

  const passwordStrength = getPasswordStrength(password)
  const passwordMatch = getPasswordMatch()

  const validatePassword = (pass: string): string | null => {
    if (pass.length < 8) return 'Password must be at least 8 characters'
    if (!/[A-Z]/.test(pass)) return 'Password must contain at least one uppercase letter'
    if (!/[a-z]/.test(pass)) return 'Password must contain at least one lowercase letter'
    if (!/[0-9]/.test(pass)) return 'Password must contain at least one number'
    return null
  }

  const validateUsername = (user: string): string | null => {
    if (user.length < 3) return 'Username must be at least 3 characters'
    if (user.length > 30) return 'Username must be less than 30 characters'
    if (!/^[a-z0-9_]+$/.test(user)) return 'Username can only contain lowercase letters, numbers, and underscores'
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')

    if (mode === 'forgot') {
      if (!email) {
        setError('Please enter your email')
        return
      }
      setLoading(true)
      try {
        await resetPasswordForEmail(email)
        setSuccessMsg('Check your email for the password reset link!')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
      return
    }

    if (mode === 'signup') {
      // Validate username
      const usernameError = validateUsername(username)
      if (usernameError) {
        setError(usernameError)
        return
      }

      // Validate password
      const passwordError = validatePassword(password)
      if (passwordError) {
        setError(passwordError)
        return
      }

      // Check password confirmation
      if (password !== confirmPassword) {
        setError('Passwords do not match')
        return
      }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent mb-2">
            PopcornPal
          </h1>
          <p className="text-gray-400">
            {mode === 'forgot' ? 'Reset your password' : 'Track what you watch, play, and read'}
          </p>
        </div>

        {/* Auth Form */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-8">
          <h2 className="text-2xl font-semibold text-white mb-6">
            {mode === 'signup' ? 'Create Account' : mode === 'forgot' ? 'Forgot Password' : 'Welcome Back'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="johndoe"
                  required={mode === 'signup'}
                />
                <p className="mt-1 text-xs text-gray-400">
                  3-30 characters, lowercase letters, numbers, and underscores only
                </p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="you@example.com"
                  required={mode !== 'forgot'}
              />
            </div>

            {mode !== 'forgot' && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="••••••••"
                    required={mode !== 'forgot'}
                    minLength={mode === 'signup' ? 8 : 6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {mode === 'signin' && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
                {mode === 'signup' && password && (
                  <div className="mt-3 space-y-2">
                    {/* Strength Bar */}
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                            level <= passwordStrength.strength
                              ? passwordStrength.strength <= 2
                                ? 'bg-red-500'
                                : passwordStrength.strength <= 3
                                ? 'bg-yellow-500'
                                : passwordStrength.strength <= 4
                                ? 'bg-blue-500'
                                : 'bg-green-500'
                              : 'bg-gray-700'
                          }`}
                        />
                      ))}
                    </div>
                    {/* Requirements */}
                    <div className="space-y-1 text-xs">
                      <div className={`flex items-center gap-2 transition-colors ${passwordStrength.checks.length ? 'text-green-400' : 'text-gray-500'}`}>
                        {passwordStrength.checks.length ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        <span>At least 8 characters</span>
                      </div>
                      <div className={`flex items-center gap-2 transition-colors ${passwordStrength.checks.uppercase ? 'text-green-400' : 'text-gray-500'}`}>
                        {passwordStrength.checks.uppercase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        <span>Uppercase letter (A-Z)</span>
                      </div>
                      <div className={`flex items-center gap-2 transition-colors ${passwordStrength.checks.lowercase ? 'text-green-400' : 'text-gray-500'}`}>
                        {passwordStrength.checks.lowercase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        <span>Lowercase letter (a-z)</span>
                      </div>
                      <div className={`flex items-center gap-2 transition-colors ${passwordStrength.checks.number ? 'text-green-400' : 'text-gray-500'}`}>
                        {passwordStrength.checks.number ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        <span>Number (0-9)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full px-4 py-3 pr-12 bg-gray-900/50 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                      !confirmPassword
                        ? 'border-gray-600 focus:ring-red-500'
                        : passwordMatch?.fullMatch
                        ? 'border-green-500 focus:ring-green-500'
                        : passwordMatch?.lengthMatch
                        ? 'border-yellow-500 focus:ring-yellow-500'
                        : 'border-red-500/50 focus:ring-red-500'
                    }`}
                    placeholder="••••••••"
                    required={mode === 'signup'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {passwordMatch && confirmPassword && (
                  <div className="mt-2">
                    {/* Match Progress Bar */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            passwordMatch.fullMatch
                              ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                              : passwordMatch.lengthMatch
                              ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                              : 'bg-gradient-to-r from-red-500 to-pink-500'
                          }`}
                          style={{ width: `${passwordMatch.matchPercentage}%` }}
                        />
                      </div>
                      <span className={`text-xs font-medium ${
                        passwordMatch.fullMatch ? 'text-green-400' : 'text-gray-400'
                      }`}>
                        {Math.round(passwordMatch.matchPercentage)}%
                      </span>
                    </div>
                    {/* Match Status */}
                    <div className="flex items-center gap-2 text-xs">
                      {passwordMatch.fullMatch ? (
                        <div className="flex items-center gap-1 text-green-400">
                          <Check className="w-4 h-4" />
                          <span className="font-medium">Passwords match!</span>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {!passwordMatch.lengthMatch && (
                            <div className="flex items-center gap-1 text-yellow-400">
                              <X className="w-3 h-3" />
                              <span>Length mismatch: {confirmPassword.length}/{password.length} characters</span>
                            </div>
                          )}
                          {passwordMatch.lengthMatch && !passwordMatch.fullMatch && (
                            <div className="flex items-center gap-1 text-red-400">
                              <X className="w-3 h-3" />
                              <span>Characters don't match</span>
                            </div>
                          )}
                          {passwordMatch.matching > 0 && (
                            <div className="text-gray-400">
                              ✓ First {passwordMatch.matching} character{passwordMatch.matching > 1 ? 's' : ''} match
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            {successMsg && (
              <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-3 text-green-400 text-sm flex items-center gap-2">
                <Check className="w-4 h-4" />
                {successMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (mode === 'forgot' && !!successMsg)}
              className="w-full bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold py-3 rounded-lg hover:from-red-600 hover:to-pink-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : mode === 'signup' ? 'Sign Up' : mode === 'forgot' ? 'Send Reset Link' : 'Sign In'}
            </button>
          </form>

          {/* Toggle Sign In / Sign Up / Forgot Password */}
          <div className="mt-6 text-center space-y-2">
            {mode === 'forgot' ? (
              <button
                onClick={() => switchMode('signin')}
                className="text-gray-400 hover:text-white transition-colors"
              >
                Back to Sign In
              </button>
            ) : (
              <button
                onClick={() => switchMode(mode === 'signup' ? 'signin' : 'signup')}
                className="text-gray-400 hover:text-white transition-colors"
              >
                {mode === 'signup' ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}