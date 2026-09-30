import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getActivities } from '../controllers/activityController.js';

const router = Router();

router.use(requireAuth);

router.get('/boards/:boardId/activities', getActivities);

export default router;
