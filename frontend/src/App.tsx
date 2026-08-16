import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home.tsx'
import Login from './pages/Login.tsx'
import Register from './pages/Register.tsx'
import Dashboard from './pages/Dashboard.tsx'
import TerminalWorkspace from './pages/TerminalWorkspace.tsx'
import ConnectionHistory from './pages/ConnectionHistory.tsx'
import AdminUsers from './pages/AdminUsers.tsx'
import ProtectedRoute from './auth/ProtectedRoute.tsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/terminal"
        element={
          <ProtectedRoute>
            <TerminalWorkspace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <ConnectionHistory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminUsers />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App
