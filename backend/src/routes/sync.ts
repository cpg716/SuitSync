import express from 'express';
import {
  getSyncStatus,
  triggerSync,
  getSyncErrors,
  resetSyncStatus,
  syncCustomers,
  syncSales,
  syncUsers,
  syncGroups,
  previewCustomerSync
} from '../controllers/syncController';
import { authMiddleware, requireAdmin } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import logger from '../utils/logger';

const router = express.Router();

router.get('/errors', asyncHandler(getSyncErrors));
router.get('/status', asyncHandler(getSyncStatus));
router.post('/trigger/:resource', authMiddleware, requireAdmin, asyncHandler(triggerSync));
router.post('/reset-status', authMiddleware, requireAdmin, asyncHandler(resetSyncStatus));

// Legacy routes for frontend compatibility
router.post('/customers', authMiddleware, asyncHandler(syncCustomers));
router.post('/sales', authMiddleware, asyncHandler(syncSales));
router.post('/users', authMiddleware, asyncHandler(syncUsers));
router.post('/groups', authMiddleware, asyncHandler(syncGroups));

// Add preview route for customer sync
router.get('/customers/preview', authMiddleware, requireAdmin, asyncHandler(previewCustomerSync));

// Internal sync endpoints that use persistent tokens (no auth required)
router.post('/internal/customers', asyncHandler(syncCustomers));
router.post('/internal/sales', asyncHandler(syncSales));
router.post('/internal/users', asyncHandler(syncUsers));
router.post('/internal/groups', asyncHandler(syncGroups));

// Manual sync endpoints (no auth required for internal use)
router.post('/manual/customers', asyncHandler(syncCustomers));
router.post('/manual/sales', asyncHandler(syncSales));
router.post('/manual/users', asyncHandler(syncUsers));
router.post('/manual/groups', asyncHandler(syncGroups));
router.post('/manual/trigger', async (req, res) => {
  try {
    const { resource } = req.body;
    const syncFunctions: Record<string, (req: any) => Promise<void>> = {
      customers: syncCustomers,
      sales: syncSales,
      users: syncUsers,
      groups: syncGroups,
    };
    
    if (!syncFunctions[resource]) {
      return res.status(400).json({ error: 'Invalid resource specified. Supported: customers, sales, users, groups' });
    }
    
    await syncFunctions[resource](req);
    res.json({ message: `${resource} sync completed successfully` });
  } catch (error) {
    logger.error('Manual sync error:', error);
    res.status(500).json({ error: 'Sync failed' });
  }
});

export default router; 