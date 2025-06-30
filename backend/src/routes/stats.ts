import express from 'express';
import { getDashboardStats } from '../controllers/statsController';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

router.use(authMiddleware);

router.get('/dashboard', asyncHandler(getDashboardStats));

export default router; 