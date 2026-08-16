import { HugeiconsIcon } from '@hugeicons/react'
import { LockPasswordIcon, UserIcon, ViewIcon, ViewOffIcon } from '@hugeicons/core-free-icons'
import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.tsx'
import ThemeToggle from '../components/ThemeToggle.tsx'
import type { LoginPayload } from '../types'

function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [form, setForm] = useState<LoginPayload>({ username: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [event.target.name]: event.target.value })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(form)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="text-4xl" aria-hidden="true">
            🕸️
          </span>
          <div>
            <h1 className="h3">Welcome back</h1>
            <p className="text-sm opacity-60">Log in to manage your SSH connections</p>
          </div>
        </div>

        <div className="card preset-filled-surface-100-900 space-y-4 p-6">
          {error && <p className="text-error-500 text-sm">{error}</p>}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="label">
              <span className="label-text">Username</span>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center opacity-50">
                  <HugeiconsIcon icon={UserIcon} size={18} strokeWidth={1.5} />
                </span>
                <input
                  className="input pl-10"
                  type="text"
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  autoComplete="username"
                  required
                />
              </div>
            </label>
            <label className="label">
              <span className="label-text">Password</span>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center opacity-50">
                  <HugeiconsIcon icon={LockPasswordIcon} size={18} strokeWidth={1.5} />
                </span>
                <input
                  className="input pl-10 pr-10"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-3 flex items-center opacity-50 hover:opacity-100"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <HugeiconsIcon icon={showPassword ? ViewOffIcon : ViewIcon} size={18} strokeWidth={1.5} />
                </button>
              </div>
            </label>

            <button className="btn preset-filled-primary-500 w-full" type="submit" disabled={submitting}>
              {submitting ? 'Logging in…' : 'Log in'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm opacity-60">
          Don&rsquo;t have an account?{' '}
          <Link className="anchor" to="/register">
            Register
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Login
