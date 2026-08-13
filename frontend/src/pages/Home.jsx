import { useEffect, useState } from 'react'
import { api } from '../api/client'

function Home() {
  const [status, setStatus] = useState('checking...')

  useEffect(() => {
    api
      .health()
      .then((data) => setStatus(data.status))
      .catch(() => setStatus('unreachable'))
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="card preset-filled-surface-100-900 w-full max-w-md space-y-4 p-6 text-center">
        <h1 className="h2">Webmius</h1>
        <p className="opacity-60">
          Backend status: <strong>{status}</strong>
        </p>
      </div>
    </div>
  )
}

export default Home
