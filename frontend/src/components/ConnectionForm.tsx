import { useState, type ChangeEvent, type FormEvent } from 'react'
import type { ConnectionPayload, SSHConnection } from '../types'

interface FormState {
  name: string
  host: string
  port: string
  username: string
  password: string
}

const emptyForm: FormState = { name: '', host: '', port: '22', username: '', password: '' }

function toFormState(connection?: SSHConnection): FormState {
  if (!connection) return emptyForm
  return {
    name: connection.name,
    host: connection.host,
    port: String(connection.port),
    username: connection.username,
    password: '',
  }
}

interface ConnectionFormProps {
  initialValues?: SSHConnection
  onSubmit: (payload: ConnectionPayload) => Promise<void>
  onCancel: () => void
  isEditing?: boolean
}

function ConnectionForm({ initialValues, onSubmit, onCancel, isEditing = false }: ConnectionFormProps) {
  const [form, setForm] = useState<FormState>(() => toFormState(initialValues))
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setForm({ ...form, [name]: name === 'port' ? value.replace(/\D/g, '') : value })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const payload: ConnectionPayload = {
        name: form.name,
        host: form.host,
        username: form.username,
        port: Number(form.port) || 22,
        password: form.password,
      }
      if (isEditing && !payload.password) {
        delete payload.password
      }
      await onSubmit(payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
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
