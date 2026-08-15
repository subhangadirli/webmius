import { io, type Socket } from 'socket.io-client'
import { API_URL } from '../api/client'

export function createSshSocket(): Socket {
  return io(`${API_URL}/ws/ssh-session`, {
    withCredentials: true,
    autoConnect: false,
  })
}
