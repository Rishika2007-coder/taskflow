import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { getIO } from '../lib/socket.js';

const createCommentSchema = z.object({
  content: z.string().min(1).max(1000),
});

export async function addComment(req: AuthRequest, res: Response) {
  const { content } = createCommentSchema.parse(req.body);
  const { taskId } = req.params;

  const task = await prisma.task.findFirst({
    where: { id: taskId, column: { board: { ownerId: req.userId } } },
  });
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const comment = await prisma.comment.create({
    data: { content, taskId, userId: req.userId! },
    include: { user: { select: { id: true, name: true, avatar: true } } },
  });

  getIO().to(`board:${task.columnId}`).emit('comment:added', comment);
  res.status(201).json(comment);
}

export async function getComments(req: AuthRequest, res: Response) {
  const { taskId } = req.params;

  const task = await prisma.task.findFirst({
    where: { id: taskId, column: { board: { ownerId: req.userId } } },
  });
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const comments = await prisma.comment.findMany({
    where: { taskId },
    include: { user: { select: { id: true, name: true, avatar: true } } },
    orderBy: { createdAt: 'asc' },
  });

  res.json(comments);
}

export async function deleteComment(req: AuthRequest, res: Response) {
  const { id } = req.params;

  const comment = await prisma.comment.findFirst({
    where: { id, userId: req.userId },
  });
  if (!comment) {
    return res.status(404).json({ error: 'Comment not found' });
  }

  await prisma.comment.delete({ where: { id } });
  res.status(204).send();
}
