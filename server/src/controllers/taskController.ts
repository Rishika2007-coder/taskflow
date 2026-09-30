import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { getIO } from '../lib/socket.js';
import { AuthRequest } from '../middleware/auth.js';
import { logActivity } from './activityController.js';

const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  priority: z.enum(['none', 'low', 'medium', 'high']).optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  priority: z.enum(['none', 'low', 'medium', 'high']).optional(),
});

const moveTaskSchema = z.object({
  columnId: z.string().min(1),
  position: z.number().int().min(0),
});

async function verifyColumnOwnership(columnId: string, userId: string) {
  const column = await prisma.column.findFirst({
    where: { id: columnId, board: { ownerId: userId } },
  });
  return column !== null;
}

async function verifyTaskOwnership(taskId: string, userId: string) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, column: { board: { ownerId: userId } } },
  });
  return task !== null;
}

export async function createTask(req: AuthRequest, res: Response) {
  const { title, description, dueDate, priority } = createTaskSchema.parse(req.body);
  const { columnId } = req.params;

  if (!(await verifyColumnOwnership(columnId, req.userId!))) {
    return res.status(404).json({ error: 'Column not found' });
  }

  const maxPosition = await prisma.task.aggregate({
    where: { columnId },
    _max: { position: true },
  });

  const task = await prisma.task.create({
    data: {
      title,
      description,
      dueDate: dueDate ? new Date(dueDate) : null,
      priority: priority || 'none',
      columnId,
      position: (maxPosition._max.position ?? -1) + 1,
    },
    include: { labels: { include: { label: true } } },
  });

  const column = await prisma.column.findUnique({ where: { id: columnId } });
  await logActivity(column!.boardId, req.userId!, 'task_created', `Created task "${title}"`);
  getIO().to(`board:${columnId}`).emit('task:created', task);
  res.status(201).json(task);
}

export async function updateTask(req: AuthRequest, res: Response) {
  const data = updateTaskSchema.parse(req.body);

  if (!(await verifyTaskOwnership(req.params.id, req.userId!))) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const task = await prisma.task.update({
    where: { id: req.params.id },
    data: {
      ...data,
      dueDate: data.dueDate !== undefined ? (data.dueDate ? new Date(data.dueDate) : null) : undefined,
    },
    include: { labels: { include: { label: true } } },
  });

  await logActivity(task.columnId, req.userId!, 'task_updated', `Updated task "${task.title}"`);
  getIO().to(`board:${task.columnId}`).emit('task:updated', task);
  res.json(task);
}

export async function moveTask(req: AuthRequest, res: Response) {
  const { columnId, position } = moveTaskSchema.parse(req.body);

  if (!(await verifyTaskOwnership(req.params.id, req.userId!))) {
    return res.status(404).json({ error: 'Task not found' });
  }
  if (!(await verifyColumnOwnership(columnId, req.userId!))) {
    return res.status(404).json({ error: 'Column not found' });
  }

  const task = await prisma.task.findUniqueOrThrow({ where: { id: req.params.id } });

  await prisma.$transaction(async (tx) => {
    if (task.columnId === columnId) {
      if (task.position < position) {
        await tx.task.updateMany({
          where: { columnId, position: { gt: task.position, lte: position } },
          data: { position: { decrement: 1 } },
        });
      } else {
        await tx.task.updateMany({
          where: { columnId, position: { gte: position, lt: task.position } },
          data: { position: { increment: 1 } },
        });
      }
    } else {
      await tx.task.updateMany({
        where: { columnId: task.columnId, position: { gt: task.position } },
        data: { position: { decrement: 1 } },
      });
      await tx.task.updateMany({
        where: { columnId, position: { gte: position } },
        data: { position: { increment: 1 } },
      });
    }

    await tx.task.update({
      where: { id: task.id },
      data: { columnId, position },
    });
  });

  const updated = await prisma.task.findUnique({
    where: { id: task.id },
    include: { labels: { include: { label: true } } },
  });
  await logActivity(columnId, req.userId!, 'task_moved', `Moved task "${updated!.title}"`);
  getIO().to(`board:${columnId}`).emit('task:moved', updated);
  res.json(updated);
}

export async function deleteTask(req: AuthRequest, res: Response) {
  if (!(await verifyTaskOwnership(req.params.id, req.userId!))) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const task = await prisma.task.findUniqueOrThrow({ where: { id: req.params.id } });

  await prisma.$transaction(async (tx) => {
    await tx.task.delete({ where: { id: task.id } });
    await tx.task.updateMany({
      where: { columnId: task.columnId, position: { gt: task.position } },
      data: { position: { decrement: 1 } },
    });
  });

  await logActivity(task.columnId, req.userId!, 'task_deleted', `Deleted task "${task.title}"`);
  getIO().to(`board:${task.columnId}`).emit('task:deleted', { id: task.id });
  res.status(204).send();
}
