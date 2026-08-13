const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

async function request(path, options = {}) {
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
    throw new Error(body?.error || `Request failed with status ${response.status}`)
  }

  return body
}

export const api = {
  health: () => request('/health'),
  register: (data) => request('/api/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => request('/api/login', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => request('/api/logout', { method: 'POST' }),
  me: () => request('/api/me'),
  listConnections: () => request('/api/connections'),
  createConnection: (data) => request('/api/connections', { method: 'POST', body: JSON.stringify(data) }),
  updateConnection: (id, data) => request(`/api/connections/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteConnection: (id) => request(`/api/connections/${id}`, { method: 'DELETE' }),
}
