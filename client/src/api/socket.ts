import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = localStorage.getItem('token');
    socket = io(import.meta.env.VITE_API_URL || 'http://localhost:4000', {
      auth: { token },
    });
  }
  return socket;
}
