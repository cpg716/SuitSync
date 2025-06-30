import express from 'express';
import {
  getSyncStatus,
  triggerSync,
  getSyncErrors,
  resetSyncStatus,
  manualUserPhotoSync
} from '../controllers/syncController';
import { authMiddleware, requireAdmin } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

router.get('/errors', asyncHandler(getSyncErrors));
router.get('/status', authMiddleware, asyncHandler(getSyncStatus));
router.post('/trigger/:resource', authMiddleware, requireAdmin, asyncHandler(triggerSync));
router.post('/reset-status', authMiddleware, requireAdmin, asyncHandler(resetSyncStatus));
router.post('/user-photos', authMiddleware, requireAdmin, asyncHandler(manualUserPhotoSync));

// Legacy routes for frontend compatibility
router.post('/customers', authMiddleware, requireAdmin, asyncHandler(async (req, res) => {
  req.params.resource = 'customers';
  return triggerSync(req, res);
}));

export default router; 