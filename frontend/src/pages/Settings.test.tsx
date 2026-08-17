import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../auth/AuthContext.tsx'
import { PreferencesProvider } from '../theme/PreferencesContext.tsx'
import { ThemeProvider } from '../theme/ThemeContext.tsx'
import Settings from './Settings.tsx'

const { me, getAppSettings } = vi.hoisted(() => ({
  me: vi.fn(),
  getAppSettings: vi.fn(),
}))

vi.mock('../api/client', () => ({
  api: { health: vi.fn().mockResolvedValue({ status: 'ok' }), me, getAppSettings },
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <PreferencesProvider>
          <AuthProvider>
            <Settings />
          </AuthProvider>
        </PreferencesProvider>
      </ThemeProvider>
    </MemoryRouter>,
  )
}

describe('Settings', () => {
  it('prefills account fields and hides admin settings for a regular user', async () => {
    me.mockResolvedValueOnce({ id: 1, username: 'alice', email: 'alice@example.com', role: 'user' })

    renderPage()

    expect(await screen.findByDisplayValue('alice')).toBeInTheDocument()
    expect(screen.getByDisplayValue('alice@example.com')).toBeInTheDocument()
    expect(screen.queryByText(/admin settings/i)).not.toBeInTheDocument()
  })

  it('loads and shows admin settings for an admin user', async () => {
    me.mockResolvedValueOnce({ id: 1, username: 'alice', email: 'alice@example.com', role: 'admin' })
    getAppSettings.mockResolvedValueOnce({ registration_enabled: false, session_timeout_minutes: 30 })

    renderPage()

    // Wait for AuthContext's own api.me() to resolve and commit first — the
    // admin section only mounts once `user.role` is known, and the profile
    // form provides an unambiguous DOM signal for that first step.
    await screen.findByDisplayValue('alice')

    expect(await screen.findByText(/admin settings/i)).toBeInTheDocument()
    expect(await screen.findByDisplayValue('30')).toBeInTheDocument()
  })
})
