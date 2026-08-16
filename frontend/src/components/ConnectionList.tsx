import { Link } from 'react-router-dom'
import type { SSHConnection } from '../types'

interface ConnectionListProps {
  connections: SSHConnection[]
  onEdit: (connection: SSHConnection) => void
  onDelete: (connection: SSHConnection) => void
  deletingId?: number | null
}

function ConnectionList({ connections, onEdit, onDelete, deletingId = null }: ConnectionListProps) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {connections.map((connection) => {
        const isDeleting = deletingId === connection.id
        return (
          <li
            key={connection.id}
            className="card preset-filled-surface-100-900 space-y-2 p-4"
            aria-busy={isDeleting}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{connection.name}</p>
                <p className="text-sm opacity-60">
                  {connection.username}@{connection.host}:{connection.port}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Link
                to={`/connections/${connection.id}/terminal`}
                className="btn btn-sm preset-filled-primary-500"
              >
                Connect
              </Link>
              <button
                type="button"
                className="btn btn-sm preset-tonal"
                onClick={() => onEdit(connection)}
                disabled={isDeleting}
              >
                Edit
              </button>
              <button
                type="button"
                className="btn btn-sm preset-tonal-error"
                onClick={() => onDelete(connection)}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export default ConnectionList
