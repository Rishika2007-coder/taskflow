import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { getIO } from '../lib/socket.js';
import { logActivity } from './activityController.js';

const createBoardSchema = z.object({
  title: z.string().min(1).max(100),
  template: z.string().optional(),
});

const inviteSchema = z.object({
  email: z.string().email(),
});

const templates: Record<string, { title: string; columns: { title: string }[] }> = {
  sprint: {
    title: 'Sprint Board',
    columns: [
      { title: 'Backlog' },
      { title: 'To Do' },
      { title: 'In Progress' },
      { title: 'Review' },
      { title: 'Done' },
    ],
  },
  bug: {
    title: 'Bug Tracker',
    columns: [
      { title: 'Reported' },
      { title: 'Confirmed' },
      { title: 'In Fix' },
      { title: 'Testing' },
      { title: 'Resolved' },
    ],
  },
  content: {
    title: 'Content Calendar',
    columns: [
      { title: 'Ideas' },
      { title: 'Writing' },
      { title: 'Editing' },
      { title: 'Scheduled' },
      { title: 'Published' },
    ],
  },
};

export async function listBoards(req: AuthRequest, res: Response) {
  const boards = await prisma.board.findMany({
    where: { ownerId: req.userId },
    orderBy: { createdAt: 'desc' },
  });
  res.json(boards);
}

export async function createBoard(req: AuthRequest, res: Response) {
  const { title, template } = createBoardSchema.parse(req.body);

  let columns: { title: string; position: number }[] = [
    { title: 'To Do', position: 0 },
    { title: 'In Progress', position: 1 },
    { title: 'Done', position: 2 },
  ];

  if (template && templates[template]) {
    const t = templates[template];
    columns = t.columns.map((c, i) => ({ ...c, position: i }));
  }

  const board = await prisma.board.create({
    data: {
      title,
      ownerId: req.userId!,
      columns: { create: columns },
    },
    include: { columns: true },
  });

  await logActivity(board.id, req.userId!, 'board_created', `Created board "${title}"`);
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
            include: {
              labels: { include: { label: true } },
              comments: { include: { user: { select: { id: true, name: true, avatar: true } } } },
            },
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

export async function exportBoard(req: AuthRequest, res: Response) {
  const board = await prisma.board.findFirst({
    where: { id: req.params.id, ownerId: req.userId },
    include: {
      columns: {
        orderBy: { position: 'asc' },
        include: { tasks: { orderBy: { position: 'asc' } } },
      },
    },
  });

  if (!board) {
    return res.status(404).json({ error: 'Board not found' });
  }

  const csv = [
    'Column,Task,Description,Due Date,Priority',
    ...board.columns.flatMap((col) =>
      col.tasks.map(
        (task) =>
          `"${col.title}","${task.title}","${task.description || ''}","${task.dueDate?.split('T')[0] || ''}","${task.priority}"`
      )
    ),
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${board.title}.csv"`);
  res.send(csv);
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

  await logActivity(boardId, req.userId!, 'member_invited', `Invited ${email}`);
  getIO().to(`board:${boardId}`).emit('board:memberAdded', member);
  res.status(201).json(member);
}

export async function getBoardMembers(req: AuthRequest, res: Response) {
  const members = await prisma.boardMember.findMany({
    where: { boardId: req.params.id },
    include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
  });
  res.json(members);
}
