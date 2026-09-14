import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react'
import Brand from '../components/brand/Brand'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { updatePassword } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    setError('')

    try {
      await updatePassword(password)
      navigate('/feed') // Redirect to feed after success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-brand">
        <Brand />
      </div>
      <div className="mx-auto w-full max-w-md md:my-auto">
        <section className="auth-form-panel" aria-labelledby="update-password-heading">
          <h2 id="update-password-heading">Choose a new password.</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            Make it one you’ll remember. At least 6 characters.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label htmlFor="new-password" className="app-label">
                New password
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="app-input pr-14"
                  autoComplete="new-password"
                  enterKeyHint="go"
                  placeholder="Make it a good one"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  className="app-icon-button absolute right-1 top-1/2 -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <p role="alert" className="app-note app-note-danger">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="app-button-primary w-full !mt-6"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={18} aria-hidden="true" />
              ) : null}
              Update password
              {!loading && <ArrowRight size={17} aria-hidden="true" />}
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}
