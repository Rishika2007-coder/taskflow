import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  listBoards,
  createBoard,
  getBoard,
  inviteToBoard,
  getBoardMembers,
} from '../controllers/boardController.js';

const router = Router();

router.use(requireAuth);

router.get('/', listBoards);
router.post('/', createBoard);
router.get('/:id', getBoard);
router.post('/:id/invite', inviteToBoard);
router.get('/:id/members', getBoardMembers);

export default router;
