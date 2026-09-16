import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { ConnectionShare, SSHConnection } from '../types'

interface ShareDialogProps {
  connection: SSHConnection
  onClose: () => void
  onChanged: () => void
}

function ShareDialog({ connection, onClose, onChanged }: ShareDialogProps) {
  const [shares, setShares] = useState<ConnectionShare[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [identifier, setIdentifier] = useState('')
  const [saving, setSaving] = useState(false)
  const [revokingId, setRevokingId] = useState<number | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      setShares(await api.listConnectionShares(connection.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection.id])

  const handleShare = async () => {
    const value = identifier.trim()
    if (!value) return
    setSaving(true)
    setError(null)
    try {
      // Accept username or email in one field; user_id lookup is supported
      // by the API but has no UI here.
      const target = value.includes('@') ? { email: value } : { username: value }
      await api.shareConnection(connection.id, target)
      setIdentifier('')
      await load()
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  const handleRevoke = async (share: ConnectionShare) => {
    if (!window.confirm(`Stop sharing "${connection.name}" with "${share.username ?? share.email}"?`)) return
    setRevokingId(share.user_id)
    setError(null)
    try {
      await api.unshareConnection(connection.id, share.user_id)
      await load()
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setRevokingId(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface-100-900 card w-full max-w-md space-y-3 p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`Share ${connection.name}`}
      >
        <h2 className="h4 break-words">Share “{connection.name}”</h2>
        <p className="text-xs opacity-60">
          Shared users can connect through your saved credentials. They cannot edit, delete, or
          re-share it, and your password or private key is never shown to them.
        </p>
        {error && <p className="text-error-500 text-sm">{error}</p>}
        <div className="flex gap-2">
          <input
            aria-label="Username or email to share with"
            placeholder="Username or email…"
            className="input flex-1"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleShare()
            }}
          />
          <button
            type="button"
            className="btn btn-sm preset-filled-primary-700-300"
            disabled={saving || !identifier.trim()}
            onClick={handleShare}
          >
            {saving ? 'Sharing…' : 'Share'}
          </button>
        </div>
        {loading && <p className="text-sm opacity-60">Loading…</p>}
        {!loading && shares.length === 0 && (
          <p className="text-sm opacity-60">Not shared with anyone yet.</p>
        )}
        {!loading && shares.length > 0 && (
          <ul className="space-y-2">
            {shares.map((s) => (
              <li key={s.user_id} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 break-words">
                  {s.username ?? s.email}
                  {s.email && s.username && <span className="opacity-60"> ({s.email})</span>}
                </span>
                <button
                  type="button"
                  className="btn btn-sm preset-tonal-error shrink-0"
                  disabled={revokingId === s.user_id}
                  onClick={() => handleRevoke(s)}
                >
                  {revokingId === s.user_id ? 'Removing…' : 'Remove'}
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex justify-end">
          <button type="button" className="btn btn-sm preset-tonal" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

export default ShareDialog
