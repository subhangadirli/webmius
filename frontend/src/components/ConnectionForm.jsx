import { useState } from 'react'

const emptyForm = { name: '', host: '', port: 22, username: '', password: '' }

function ConnectionForm({ initialValues, onSubmit, onCancel, isEditing = false }) {
  const [form, setForm] = useState({ ...emptyForm, ...initialValues })
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm({ ...form, [name]: name === 'port' ? value.replace(/\D/g, '') : value })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const payload = { ...form, port: Number(form.port) || 22 }
      if (isEditing && !payload.password) {
        delete payload.password
      }
      await onSubmit(payload)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="card preset-filled-surface-100-900 space-y-4 p-6" onSubmit={handleSubmit}>
      <h3 className="h4">{isEditing ? 'Edit connection' : 'Add connection'}</h3>

      {error && <p className="text-error-500 text-sm">{error}</p>}

      <fieldset className="fieldset grid gap-4 sm:grid-cols-2">
        <label className="label sm:col-span-2">
          <span className="label-text">Name</span>
          <input
            className="input"
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
          />
        </label>
        <label className="label">
          <span className="label-text">Host</span>
          <input
            className="input"
            type="text"
            name="host"
            value={form.host}
            onChange={handleChange}
            required
          />
        </label>
        <label className="label">
          <span className="label-text">Port</span>
          <input
            className="input"
            type="text"
            inputMode="numeric"
            name="port"
            value={form.port}
            onChange={handleChange}
            required
          />
        </label>
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
          <span className="label-text">
            Password{isEditing && <span className="opacity-60"> (leave blank to keep unchanged)</span>}
          </span>
          <input
            className="input"
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required={!isEditing}
          />
        </label>
      </fieldset>

      <div className="flex justify-end gap-2">
        <button type="button" className="btn preset-tonal" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className="btn preset-filled-primary-500" disabled={submitting}>
          {submitting ? 'Saving…' : isEditing ? 'Save changes' : 'Add connection'}
        </button>
      </div>
    </form>
  )
}

export default ConnectionForm
