import type {
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

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
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
}
