import express from 'express';
import { getLightspeedHealth, deleteLightspeedUserSessions } from '../controllers/lightspeedController';
import { authMiddleware, requireAdmin } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

router.get('/health', authMiddleware, requireAdmin, asyncHandler(getLightspeedHealth));
router.delete('/users/:userId/sessions', authMiddleware, requireAdmin, asyncHandler(deleteLightspeedUserSessions));

export default router; 