import express from 'express';
import { listAuditLogs, getAuditLog } from '../controllers/auditlogController';
import { authMiddleware, requireAdmin } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

router.use(authMiddleware, requireAdmin);

router.get('/', asyncHandler(listAuditLogs));
router.get('/:id', asyncHandler(getAuditLog));

export default router; 