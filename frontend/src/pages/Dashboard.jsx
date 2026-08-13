import { AppBar } from '@skeletonlabs/skeleton-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext.jsx'
import ConnectionForm from '../components/ConnectionForm.jsx'
import ConnectionList from '../components/ConnectionList.jsx'

function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [connections, setConnections] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [formMode, setFormMode] = useState(null) // null | 'create' | connection object

  const loadConnections = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      setConnections(await api.listConnections())
    } catch (err) {
      setLoadError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadConnections()
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const handleCreate = async (payload) => {
    await api.createConnection(payload)
    setFormMode(null)
    await loadConnections()
  }

  const handleUpdate = async (payload) => {
    await api.updateConnection(formMode.id, payload)
    setFormMode(null)
    await loadConnections()
  }

  const handleDelete = async (connection) => {
    if (!window.confirm(`Delete connection "${connection.name}"?`)) return
    await api.deleteConnection(connection.id)
    await loadConnections()
  }

  const isEditing = formMode && formMode !== 'create'

  return (
    <div className="min-h-screen">
      <AppBar>
        <AppBar.Toolbar className="grid-cols-[auto_1fr_auto]">
          <AppBar.Lead>
            <p className="h4">Webmius</p>
          </AppBar.Lead>
          <AppBar.Headline />
          <AppBar.Trail>
            <span className="text-sm opacity-60">{user?.username}</span>
            <button type="button" className="btn btn-sm preset-tonal" onClick={handleLogout}>
              Log out
            </button>
          </AppBar.Trail>
        </AppBar.Toolbar>
      </AppBar>

      <main className="mx-auto max-w-4xl space-y-4 p-6">
        {formMode && (
          <ConnectionForm
            key={isEditing ? formMode.id : 'create'}
            isEditing={Boolean(isEditing)}
            initialValues={isEditing ? formMode : undefined}
            onSubmit={isEditing ? handleUpdate : handleCreate}
            onCancel={() => setFormMode(null)}
          />
        )}

        {!formMode && (
          <div className="flex justify-end">
            <button
              type="button"
              className="btn preset-filled-primary-500"
              onClick={() => setFormMode('create')}
            >
              Add connection
            </button>
          </div>
        )}

        {loading && <p className="opacity-60">Loading connections…</p>}
        {loadError && <p className="text-error-500 text-sm">{loadError}</p>}

        {!loading && !loadError && connections.length === 0 && (
          <div className="card preset-filled-surface-100-900 flex flex-col items-center gap-3 p-12 text-center">
            <h2 className="h3">No connections yet</h2>
            <p className="opacity-60">Add your first SSH connection to get started.</p>
          </div>
        )}

        {!loading && !loadError && connections.length > 0 && (
          <ConnectionList
            connections={connections}
            onEdit={(connection) => setFormMode(connection)}
            onDelete={handleDelete}
          />
        )}
      </main>
    </div>
  )
}

export default Dashboard
