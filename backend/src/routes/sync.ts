import express from 'express';
import {
  getSyncStatus,
  triggerSync,
  getSyncErrors,
  resetSyncStatus,
  syncCustomers,
  syncProducts,
  previewCustomerSync
} from '../controllers/syncController';
import { authMiddleware, requireAdmin } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

router.get('/errors', asyncHandler(getSyncErrors));
router.get('/status', asyncHandler(getSyncStatus));
router.post('/trigger/:resource', authMiddleware, requireAdmin, asyncHandler(triggerSync));
router.post('/reset-status', authMiddleware, requireAdmin, asyncHandler(resetSyncStatus));

// Legacy routes for frontend compatibility
router.post('/customers', authMiddleware, asyncHandler(syncCustomers));
router.post('/products', authMiddleware, asyncHandler(syncProducts));

// Add preview route for customer sync
router.get('/customers/preview', authMiddleware, requireAdmin, asyncHandler(previewCustomerSync));

export default router; 