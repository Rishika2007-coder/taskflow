import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { getIO } from '../lib/socket.js';

const createColumnSchema = z.object({
  title: z.string().min(1).max(100),
});

const renameColumnSchema = z.object({
  title: z.string().min(1).max(100),
});

async function verifyColumnOwnership(columnId: string, userId: string) {
  const column = await prisma.column.findFirst({
    where: { id: columnId, board: { ownerId: userId } },
  });
  return column !== null;
}

export async function createColumn(req: AuthRequest, res: Response) {
  const { title } = createColumnSchema.parse(req.body);
  const { boardId } = req.params;

  const board = await prisma.board.findFirst({
    where: { id: boardId, ownerId: req.userId },
  });
  if (!board) {
    return res.status(404).json({ error: 'Board not found' });
  }

  const maxPosition = await prisma.column.aggregate({
    where: { boardId },
    _max: { position: true },
  });

  const column = await prisma.column.create({
    data: {
      title,
      boardId,
      position: (maxPosition._max.position ?? -1) + 1,
    },
  });

  getIO().to(`board:${boardId}`).emit('column:created', column);
  res.status(201).json(column);
}

export async function renameColumn(req: AuthRequest, res: Response) {
  const { title } = renameColumnSchema.parse(req.body);

  if (!(await verifyColumnOwnership(req.params.id, req.userId!))) {
    return res.status(404).json({ error: 'Column not found' });
  }

  const column = await prisma.column.update({
    where: { id: req.params.id },
    data: { title },
  });

  getIO().to(`board:${column.boardId}`).emit('column:updated', column);
  res.json(column);
}

export async function deleteColumn(req: AuthRequest, res: Response) {
  if (!(await verifyColumnOwnership(req.params.id, req.userId!))) {
    return res.status(404).json({ error: 'Column not found' });
  }

  const column = await prisma.column.findUniqueOrThrow({ where: { id: req.params.id } });

  await prisma.column.delete({ where: { id: req.params.id } });

  getIO().to(`board:${column.boardId}`).emit('column:deleted', { id: column.id });
  res.status(204).send();
}
