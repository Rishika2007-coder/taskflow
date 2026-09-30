import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createTask, updateTask, moveTask, deleteTask } from '../controllers/taskController.js';

const router = Router();

router.use(requireAuth);

router.post('/columns/:columnId/tasks', createTask);
router.patch('/tasks/:id', updateTask);
router.patch('/tasks/:id/move', moveTask);
router.delete('/tasks/:id', deleteTask);

export default router;
