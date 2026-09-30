import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import http from 'http';
import { prisma } from './lib/prisma.js';
import { initSocket } from './lib/socket.js';
import authRoutes from './routes/auth.js';
import boardRoutes from './routes/boards.js';
import columnRoutes from './routes/columns.js';
import taskRoutes from './routes/tasks.js';
import labelRoutes from './routes/labels.js';
import commentRoutes from './routes/comments.js';
import activityRoutes from './routes/activities.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = Number(process.env.PORT) || 4000;

const server = http.createServer(app);
initSocket(server);

app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'up' });
  } catch {
    res.status(500).json({ status: 'ok', database: 'down' });
  }
});

app.use('/auth', authRoutes);
app.use('/boards', boardRoutes);
app.use('/columns', columnRoutes);
app.use('/labels', labelRoutes);
app.use('/comments', commentRoutes);
app.use('/activities', activityRoutes);
app.use('/', taskRoutes);

app.use(errorHandler);

server.listen(PORT, () => {
  console.log(`TaskFlow API running on http://localhost:${PORT}`);
});
