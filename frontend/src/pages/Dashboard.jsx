import { AppBar } from '@skeletonlabs/skeleton-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'

function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

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

      <main className="mx-auto max-w-4xl p-6">
        <div className="card preset-filled-surface-100-900 flex flex-col items-center gap-3 p-12 text-center">
          <h2 className="h3">No connections yet</h2>
          <p className="opacity-60">Add your first SSH connection to get started.</p>
          <button type="button" className="btn preset-filled-primary-500" disabled>
            Add connection
          </button>
        </div>
      </main>
    </div>
  )
}

export default Dashboard
