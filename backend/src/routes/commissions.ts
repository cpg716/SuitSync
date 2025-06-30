import express from 'express';
import { getLeaderboard, getAllCommissions, getMyCommissions } from '../controllers/commissionsController';
import { authMiddleware, requireAdmin } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

router.use(authMiddleware);

router.get('/leaderboard', asyncHandler(getLeaderboard));
router.get('/all', requireAdmin, asyncHandler(getAllCommissions));
router.get('/mine', asyncHandler(getMyCommissions));

export default router; 