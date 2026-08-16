import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import ConnectionHistory from './ConnectionHistory.tsx'

const { listConnectionLogs } = vi.hoisted(() => ({
  listConnectionLogs: vi.fn(),
}))

vi.mock('../api/client', () => ({
  api: { listConnectionLogs },
}))

describe('ConnectionHistory', () => {
  it('shows an empty state when there are no attempts', async () => {
    listConnectionLogs.mockResolvedValueOnce([])

    render(
      <MemoryRouter>
        <ConnectionHistory />
      </MemoryRouter>,
    )

    expect(await screen.findByText(/no connection attempts yet/i)).toBeInTheDocument()
  })

  it('renders success and failure entries with their status', async () => {
    listConnectionLogs.mockResolvedValueOnce([
      {
        id: 1,
        connection_id: 1,
        connection_name: 'prod-box',
        host: '10.0.0.5',
        port: 22,
        username: 'deploy',
        status: 'success',
        error_message: null,
        started_at: '2026-08-16T10:00:00Z',
        ended_at: '2026-08-16T10:00:05Z',
      },
      {
        id: 2,
        connection_id: 2,
        connection_name: 'bad-box',
        host: '10.0.0.6',
        port: 22,
        username: 'deploy',
        status: 'failed',
        error_message: 'SSH authentication failed',
        started_at: '2026-08-16T10:05:00Z',
        ended_at: '2026-08-16T10:05:00Z',
      },
    ])

    render(
      <MemoryRouter>
        <ConnectionHistory />
      </MemoryRouter>,
    )

    expect(await screen.findByText('prod-box')).toBeInTheDocument()
    expect(screen.getByText('Connected')).toBeInTheDocument()
    expect(screen.getByText('bad-box')).toBeInTheDocument()
    expect(screen.getByText('Failed')).toBeInTheDocument()
    expect(screen.getByText('SSH authentication failed')).toBeInTheDocument()
  })
})
