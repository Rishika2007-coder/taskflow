import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createColumn, renameColumn, deleteColumn } from '../controllers/columnController.js';

const router = Router();

router.use(requireAuth);

router.post('/boards/:boardId/columns', createColumn);
router.patch('/columns/:id', renameColumn);
router.delete('/columns/:id', deleteColumn);

export default router;
