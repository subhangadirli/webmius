import { AppBar } from '@skeletonlabs/skeleton-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { ConnectionLogEntry } from '../types'

function formatDuration(startedAt: string | null, endedAt: string | null): string {
  if (!startedAt || !endedAt) return '—'
  const seconds = Math.max(0, Math.round((Date.parse(endedAt) - Date.parse(startedAt)) / 1000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  return `${minutes}m ${seconds % 60}s`
}

function ConnectionHistory() {
  const [logs, setLogs] = useState<ConnectionLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadLogs = async () => {
    setLoading(true)
    setError(null)
    try {
      setLogs(await api.listConnectionLogs())
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [])

  return (
    <div className="min-h-screen">
      <AppBar>
        <AppBar.Toolbar className="grid-cols-1 gap-2 sm:grid-cols-[auto_1fr_auto]">
          <AppBar.Lead>
            <p className="h4">Connection history</p>
          </AppBar.Lead>
          <AppBar.Headline />
          <AppBar.Trail className="flex-wrap justify-end">
            <Link to="/dashboard" className="btn btn-sm preset-tonal">
              Back to dashboard
            </Link>
          </AppBar.Trail>
        </AppBar.Toolbar>
      </AppBar>

      <main className="mx-auto max-w-4xl space-y-4 p-6">
        {loading && <p className="opacity-60">Loading history…</p>}

        {!loading && error && (
          <div className="card preset-filled-surface-100-900 flex flex-col items-center gap-3 p-12 text-center">
            <h2 className="h3">Couldn&rsquo;t load connection history</h2>
            <p className="text-error-500 text-sm">{error}</p>
            <button type="button" className="btn preset-tonal" onClick={loadLogs}>
              Retry
            </button>
          </div>
        )}

        {!loading && !error && logs.length === 0 && (
          <div className="card preset-filled-surface-100-900 flex flex-col items-center gap-3 p-12 text-center">
            <h2 className="h3">No connection attempts yet</h2>
            <p className="opacity-60">Connect to a server to see it show up here.</p>
          </div>
        )}

        {!loading && !error && logs.length > 0 && (
          <ul className="space-y-2">
            {logs.map((log) => (
              <li key={log.id} className="card preset-filled-surface-100-900 flex items-start justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="font-semibold break-words">{log.connection_name}</p>
                  <p className="text-sm opacity-60 break-words">
                    {log.username}@{log.host}:{log.port}
                  </p>
                  {log.status === 'failed' && log.error_message && (
                    <p className="text-error-500 mt-1 text-sm break-words">{log.error_message}</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                  <span
                    className={
                      log.status === 'success'
                        ? 'badge preset-filled-success-500 text-xs'
                        : 'badge preset-filled-error-500 text-xs'
                    }
                  >
                    {log.status === 'success' ? 'Connected' : 'Failed'}
                  </span>
                  <span className="text-xs opacity-60">
                    {log.started_at ? new Date(log.started_at).toLocaleString() : '—'}
                  </span>
                  {log.status === 'success' && (
                    <span className="text-xs opacity-60">
                      duration: {formatDuration(log.started_at, log.ended_at)}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}

export default ConnectionHistory
