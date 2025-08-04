import express from 'express';
import { printTag, printAlterationsTicket } from '../controllers/printController';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

// Protected routes (require auth)
router.use('/tag', authMiddleware);
router.post('/tag', asyncHandler(printTag));

// Public routes (no auth required for local network access)
router.post('/alterations-ticket', asyncHandler(printAlterationsTicket));

export default router; 