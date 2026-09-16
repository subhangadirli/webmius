import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../auth/AuthContext.tsx'
import { ThemeProvider } from '../theme/ThemeContext.tsx'
import AdminUsers from './AdminUsers.tsx'

const { me, listAdminUsers, updateAdminUser, deleteAdminUser } = vi.hoisted(() => ({
  me: vi.fn(),
  listAdminUsers: vi.fn(),
  updateAdminUser: vi.fn(),
  deleteAdminUser: vi.fn(),
}))

vi.mock('../api/client', () => ({
  api: {
    health: vi.fn().mockResolvedValue({ status: 'ok' }),
    me,
    listAdminUsers,
    updateAdminUser,
    updateAdminUserRole: vi.fn(),
    deleteAdminUser,
    getAdminUser: vi.fn(),
    listAdminUserConnections: vi.fn(),
    listAdminUserLogs: vi.fn(),
    resetAdminUserPassword: vi.fn(),
  },
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <AuthProvider>
          <AdminUsers />
        </AuthProvider>
      </ThemeProvider>
    </MemoryRouter>,
  )
}

function adminUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    username: 'alice',
    email: 'alice@example.com',
    role: 'admin',
    is_active: true,
    can_ssh: true,
    max_connections: null,
    last_login_at: null,
    connection_count: 2,
    created_at: null,
    ...overrides,
  }
}

describe('AdminUsers', () => {
  it('shows an access-denied message for a non-admin user', async () => {
    me.mockResolvedValueOnce({ id: 1, username: 'alice', email: 'alice@example.com', role: 'user' })

    renderPage()

    expect(await screen.findByText(/admins only/i)).toBeInTheDocument()
  })

  it('lists users for an admin', async () => {
    me.mockResolvedValueOnce({ id: 1, username: 'alice', email: 'alice@example.com', role: 'admin' })
    listAdminUsers.mockResolvedValueOnce([
      adminUser(),
      adminUser({
        id: 2,
        username: 'bob',
        email: 'bob@example.com',
        role: 'user',
        connection_count: 0,
      }),
    ])

    renderPage()

    expect(await screen.findByText('bob')).toBeInTheDocument()
    expect(screen.getByText('alice')).toBeInTheDocument()
    expect(screen.getByText('(you)')).toBeInTheDocument()
  })

  it('lets an admin change another user role but not their own', async () => {
    me.mockResolvedValueOnce({ id: 1, username: 'alice', email: 'alice@example.com', role: 'admin' })
    listAdminUsers.mockResolvedValueOnce([
      adminUser(),
      adminUser({
        id: 2,
        username: 'bob',
        email: 'bob@example.com',
        role: 'user',
        connection_count: 0,
      }),
    ])

    renderPage()

    const bobRole = (await screen.findByLabelText('Role for bob')) as HTMLSelectElement
    expect(bobRole.value).toBe('user')
    expect(bobRole).not.toBeDisabled()

    const selfRole = screen.getByLabelText('Role for alice') as HTMLSelectElement
    expect(selfRole).toBeDisabled()
  })

  it('filters users by search query', async () => {
    me.mockResolvedValueOnce({ id: 1, username: 'alice', email: 'alice@example.com', role: 'admin' })
    listAdminUsers.mockResolvedValueOnce([
      adminUser(),
      adminUser({
        id: 2,
        username: 'bob',
        email: 'bob@example.com',
        role: 'user',
        connection_count: 0,
      }),
    ])

    renderPage()

    expect(await screen.findByText('bob')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/search users/i), { target: { value: 'alice' } })
    expect(screen.queryByText('bob')).not.toBeInTheDocument()
    expect(screen.getByText('alice')).toBeInTheDocument()
  })
})
