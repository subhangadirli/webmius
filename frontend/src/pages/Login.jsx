import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'

function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await api.login(form)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="card preset-filled-surface-100-900 w-full max-w-md space-y-4 p-6">
        <h1 className="h3 text-center">Log in</h1>

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
            {submitting ? 'Logging in…' : 'Log in'}
          </button>
        </form>

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
