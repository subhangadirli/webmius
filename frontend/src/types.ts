export interface User {
  id: number
  username: string
  email: string
}

export type AuthType = 'password' | 'key'

export interface SSHConnection {
  id: number
  name: string
  host: string
  port: number
  username: string
  auth_type: AuthType
  created_at: string | null
}

export interface RegisterPayload {
  username: string
  email: string
  password: string
}

export interface LoginPayload {
  username: string
  password: string
}

export interface ConnectionPayload {
  name: string
  host: string
  port: number
  username: string
  password?: string
  auth_type?: AuthType
}
