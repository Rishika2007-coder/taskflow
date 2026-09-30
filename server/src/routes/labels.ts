import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  createLabel,
  updateLabel,
  deleteLabel,
  addLabelToTask,
  removeLabelFromTask,
} from '../controllers/labelController.js';

const router = Router();

router.use(requireAuth);

router.post('/boards/:boardId/labels', createLabel);
router.patch('/labels/:id', updateLabel);
router.delete('/labels/:id', deleteLabel);
router.post('/tasks/:taskId/labels/:labelId', addLabelToTask);
router.delete('/tasks/:taskId/labels/:labelId', removeLabelFromTask);

export default router;
