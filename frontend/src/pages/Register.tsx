import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.tsx'
import type { RegisterPayload } from '../types'

function Register() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [form, setForm] = useState<RegisterPayload>({ username: '', email: '', password: '' })
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
      await register(form)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="card preset-filled-surface-100-900 w-full max-w-md space-y-4 p-6">
        <h1 className="h3 text-center">Create an account</h1>

        {error && <p className="text-error-500 text-sm">{error}</p>}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <fieldset className="fieldset space-y-2">
            <label className="label">
              <span className="label-text">Username</span>
              <input
                className="input"
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                required
              />
            </label>
            <label className="label">
              <span className="label-text">Email</span>
              <input
                className="input"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
              />
            </label>
            <label className="label">
              <span className="label-text">Password</span>
              <input
                className="input"
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
              />
            </label>
          </fieldset>

          <button className="btn preset-filled-primary-500 w-full" type="submit" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Register'}
          </button>
        </form>

        <p className="text-center text-sm opacity-60">
          Already have an account?{' '}
          <Link className="anchor" to="/login">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Register
