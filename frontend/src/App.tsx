import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home.tsx'
import Login from './pages/Login.tsx'
import Register from './pages/Register.tsx'
import Dashboard from './pages/Dashboard.tsx'
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
    </Routes>
  )
}

export default App
