import express from 'express';
import { getLightspeedHealth, deleteLightspeedUserSessions, debugListLightspeedUsers } from '../controllers/lightspeedController';
import { authMiddleware, requireAdmin } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

router.get('/health', asyncHandler(getLightspeedHealth));
router.delete('/users/:userId/sessions', authMiddleware, requireAdmin, asyncHandler(deleteLightspeedUserSessions));
router.get('/debug/ls-users', debugListLightspeedUsers);

export default router; 