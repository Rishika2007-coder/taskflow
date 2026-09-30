import { Server } from 'socket.io';
import http from 'http';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma.js';

let io: Server;

export function initSocket(server: http.Server) {
  io = new Server(server, {
    cors: { origin: process.env.CLIENT_URL },
  });

  // Authenticate socket connections with JWT
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Missing token'));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
      socket.data.userId = payload.userId;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId;

    socket.on('board:join', async (boardId: string) => {
      // Verify ownership before allowing join
      const board = await prisma.board.findFirst({
        where: { id: boardId, ownerId: userId },
      });
      if (board) {
        socket.join(`board:${boardId}`);
      }
    });

    socket.on('board:leave', (boardId: string) => {
      socket.leave(`board:${boardId}`);
    });
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}
