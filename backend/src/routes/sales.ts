import express from 'express';
import { getRecentSales } from '../controllers/salesController';
import { getLeaderboard } from '../controllers/commissionsController';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

router.get('/recent', authMiddleware, asyncHandler(getRecentSales));
router.get('/commissions', authMiddleware, asyncHandler(getLeaderboard));

export default router; 