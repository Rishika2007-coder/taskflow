import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { getIO } from '../lib/socket.js';

const createBoardSchema = z.object({
  title: z.string().min(1).max(100),
});

const inviteSchema = z.object({
  email: z.string().email(),
});

export async function listBoards(req: AuthRequest, res: Response) {
  const boards = await prisma.board.findMany({
    where: { ownerId: req.userId },
    orderBy: { createdAt: 'desc' },
  });
  res.json(boards);
}

export async function createBoard(req: AuthRequest, res: Response) {
  const { title } = createBoardSchema.parse(req.body);

  const board = await prisma.board.create({
    data: {
      title,
      ownerId: req.userId!,
      columns: {
        create: [
          { title: 'To Do', position: 0 },
          { title: 'In Progress', position: 1 },
          { title: 'Done', position: 2 },
        ],
      },
    },
    include: { columns: true },
  });

  res.status(201).json(board);
}

export async function getBoard(req: AuthRequest, res: Response) {
  const board = await prisma.board.findFirst({
    where: { id: req.params.id, ownerId: req.userId },
    include: {
      columns: {
        orderBy: { position: 'asc' },
        include: {
          tasks: {
            orderBy: { position: 'asc' },
            include: { labels: { include: { label: true } } },
          },
        },
      },
      labels: true,
    },
  });

  if (!board) {
    return res.status(404).json({ error: 'Board not found' });
  }

  res.json(board);
}

export async function inviteToBoard(req: AuthRequest, res: Response) {
  const { email } = inviteSchema.parse(req.body);
  const { id: boardId } = req.params;

  const board = await prisma.board.findFirst({
    where: { id: boardId, ownerId: req.userId },
  });
  if (!board) {
    return res.status(404).json({ error: 'Board not found' });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const member = await prisma.boardMember.upsert({
    where: { boardId_userId: { boardId, userId: user.id } },
    update: {},
    create: { boardId, userId: user.id },
  });

  getIO().to(`board:${boardId}`).emit('board:memberAdded', member);
  res.status(201).json(member);
}

export async function getBoardMembers(req: AuthRequest, res: Response) {
  const members = await prisma.boardMember.findMany({
    where: { boardId: req.params.id },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  res.json(members);
}
