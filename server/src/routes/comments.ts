import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { addComment, getComments, deleteComment } from '../controllers/commentController.js';

const router = Router();

router.use(requireAuth);

router.post('/tasks/:taskId/comments', addComment);
router.get('/tasks/:taskId/comments', getComments);
router.delete('/comments/:id', deleteComment);

export default router;
