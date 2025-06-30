import express from 'express';
import { getRecentSales } from '../controllers/salesController';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

router.get('/recent', authMiddleware, asyncHandler(getRecentSales));

export default router; 