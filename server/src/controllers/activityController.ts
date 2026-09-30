import { Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from '../middleware/auth.js';

export async function getActivities(req: AuthRequest, res: Response) {
  const { boardId } = req.params;

  const board = await prisma.board.findFirst({
    where: { id: boardId, ownerId: req.userId },
  });
  if (!board) {
    return res.status(404).json({ error: 'Board not found' });
  }

  const activities = await prisma.activity.findMany({
    where: { boardId },
    include: { user: { select: { id: true, name: true, avatar: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  res.json(activities);
}

export async function logActivity(boardId: string, userId: string, action: string, details?: string) {
  await prisma.activity.create({
    data: { boardId, userId, action, details },
  });
}
