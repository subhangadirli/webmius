import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { Socket } from 'socket.io-client'
import Terminal, { type TerminalHandle } from '../components/Terminal.tsx'
import { createSshSocket } from '../terminal/socket.ts'
import type { SSHErrorEvent, SSHOutputEvent } from '../types'

type SessionStatus = 'connecting' | 'connected' | 'closed' | 'error'

function TerminalPage() {
  const { id } = useParams<{ id: string }>()
  const terminalRef = useRef<TerminalHandle>(null)
  const socketRef = useRef<Socket | null>(null)

  const [status, setStatus] = useState<SessionStatus>('connecting')
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    setStatus('connecting')
    setError(null)
    terminalRef.current?.reset()

    const socket = createSshSocket()
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('ssh_connect', { connection_id: Number(id) })
    })

    socket.on('ssh_connected', () => {
      setStatus('connected')
    })

    socket.on('ssh_output', (payload: SSHOutputEvent) => {
      terminalRef.current?.write(payload.data)
    })

    socket.on('ssh_error', (payload: SSHErrorEvent) => {
      setStatus('error')
      setError(payload.message)
    })

    socket.on('ssh_closed', () => {
      setStatus('closed')
    })

    socket.on('connect_error', (err: Error) => {
      setStatus('error')
      setError(err.message)
    })

    socket.connect()

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [id, attempt])

  const handleData = (data: string) => {
    socketRef.current?.emit('ssh_input', { data })
  }

  const handleResize = (cols: number, rows: number) => {
    socketRef.current?.emit('ssh_resize', { cols, rows })
  }

  return (
    <div className="flex h-screen flex-col bg-black">
      <div className="flex items-start justify-between gap-3 border-b border-white/10 p-3">
        <Link to="/dashboard" className="btn btn-sm preset-tonal">
          Back
        </Link>
        <span className="text-sm text-white/60">
          {status === 'connecting' && 'Connecting…'}
          {status === 'connected' && 'Connected'}
          {status === 'closed' && 'Session closed'}
          {status === 'error' && `Error: ${error}`}
        </span>
        {(status === 'closed' || status === 'error') && (
          <button
            type="button"
            className="btn btn-sm preset-filled-primary-500"
            onClick={() => setAttempt((n) => n + 1)}
          >
            Reconnect
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1 p-2">
        <Terminal ref={terminalRef} onData={handleData} onResize={handleResize} />
      </div>
    </div>
  )
}

export default TerminalPage
