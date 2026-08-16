import type {
  AdminUser,
  ConnectionLogEntry,
  ConnectionPayload,
  LoginPayload,
  RegisterPayload,
  SSHConnection,
  User,
} from '../types'

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

interface ApiErrorBody {
  error?: string
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', undefined])

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }

  if (!SAFE_METHODS.has(options.method?.toUpperCase())) {
    const csrfToken = readCookie('csrf_token')
    if (csrfToken) headers['X-CSRF-Token'] = csrfToken
  }

  const response = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers,
    ...options,
  })

  const isJson = response.headers.get('content-type')?.includes('application/json')
  const body = isJson ? await response.json() : null

  if (!response.ok) {
    throw new Error((body as ApiErrorBody | null)?.error || `Request failed with status ${response.status}`)
  }

  return body as T
}

export const api = {
  health: () => request<{ status: string }>('/health'),
  register: (data: RegisterPayload) =>
    request<User>('/api/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: LoginPayload) =>
    request<User>('/api/login', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => request<null>('/api/logout', { method: 'POST' }),
  me: () => request<User>('/api/me'),
  listConnections: () => request<SSHConnection[]>('/api/connections'),
  createConnection: (data: ConnectionPayload) =>
    request<SSHConnection>('/api/connections', { method: 'POST', body: JSON.stringify(data) }),
  updateConnection: (id: number, data: Partial<ConnectionPayload>) =>
    request<SSHConnection>(`/api/connections/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteConnection: (id: number) => request<null>(`/api/connections/${id}`, { method: 'DELETE' }),
  listConnectionLogs: () => request<ConnectionLogEntry[]>('/api/connection-logs'),
  getConnectionLogRecording: (id: number) =>
    request<{ recording: string | null }>(`/api/connection-logs/${id}/recording`),
  listAdminUsers: () => request<AdminUser[]>('/api/admin/users'),
  deleteAdminUser: (id: number) => request<null>(`/api/admin/users/${id}`, { method: 'DELETE' }),
}
