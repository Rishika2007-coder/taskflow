import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { getIO } from '../lib/socket.js';

const createLabelSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

const updateLabelSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

async function verifyBoardOwnership(boardId: string, userId: string) {
  const board = await prisma.board.findFirst({
    where: { id: boardId, ownerId: userId },
  });
  return board !== null;
}

export async function createLabel(req: AuthRequest, res: Response) {
  const { name, color } = createLabelSchema.parse(req.body);
  const { boardId } = req.params;

  if (!(await verifyBoardOwnership(boardId, req.userId!))) {
    return res.status(404).json({ error: 'Board not found' });
  }

  const label = await prisma.label.create({
    data: { name, color, boardId },
  });

  getIO().to(`board:${boardId}`).emit('label:created', label);
  res.status(201).json(label);
}

export async function updateLabel(req: AuthRequest, res: Response) {
  const data = updateLabelSchema.parse(req.body);

  const label = await prisma.label.findFirst({
    where: { id: req.params.id, board: { ownerId: req.userId } },
  });
  if (!label) {
    return res.status(404).json({ error: 'Label not found' });
  }

  const updated = await prisma.label.update({
    where: { id: req.params.id },
    data,
  });

  getIO().to(`board:${label.boardId}`).emit('label:updated', updated);
  res.json(updated);
}

export async function deleteLabel(req: AuthRequest, res: Response) {
  const label = await prisma.label.findFirst({
    where: { id: req.params.id, board: { ownerId: req.userId } },
  });
  if (!label) {
    return res.status(404).json({ error: 'Label not found' });
  }

  await prisma.label.delete({ where: { id: req.params.id } });

  getIO().to(`board:${label.boardId}`).emit('label:deleted', { id: label.id });
  res.status(204).send();
}

export async function addLabelToTask(req: AuthRequest, res: Response) {
  const { taskId, labelId } = req.params;

  const task = await prisma.task.findFirst({
    where: { id: taskId, column: { board: { ownerId: req.userId } } },
  });
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const label = await prisma.label.findFirst({
    where: { id: labelId, board: { ownerId: req.userId } },
  });
  if (!label) {
    return res.status(404).json({ error: 'Label not found' });
  }

  await prisma.taskLabel.create({
    data: { taskId, labelId },
  });

  const updated = await prisma.task.findUnique({
    where: { id: taskId },
    include: { labels: { include: { label: true } } },
  });

  getIO().to(`board:${task.columnId}`).emit('task:updated', updated);
  res.json(updated);
}

export async function removeLabelFromTask(req: AuthRequest, res: Response) {
  const { taskId, labelId } = req.params;

  const task = await prisma.task.findFirst({
    where: { id: taskId, column: { board: { ownerId: req.userId } } },
  });
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  await prisma.taskLabel.delete({
    where: { taskId_labelId: { taskId, labelId } },
  });

  const updated = await prisma.task.findUnique({
    where: { id: taskId },
    include: { labels: { include: { label: true } } },
  });

  getIO().to(`board:${task.columnId}`).emit('task:updated', updated);
  res.json(updated);
}
