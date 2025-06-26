const express = require('express');
const prisma = require('../prismaClient');
const router = express.Router();
const { getSyncStatus, triggerSync } = require('../controllers/syncController');
const { authMiddleware, requireAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');
const { syncResource, syncUserPhotos } = require('../services/syncService');

// This route is safe and does not depend on the sync service.
router.get('/errors', async (req, res) => {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const errors = await prisma.syncLog.findMany({
    where: { status: 'failed', createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
    select: { id: true, message: true, createdAt: true },
    take: 20,
  });
  res.json(errors);
});

// Route to get the status of all sync processes
// Accessible by any authenticated user
router.get('/status', authMiddleware, getSyncStatus);

// Route to manually trigger a sync process for a specific resource
// Accessible only by authenticated admin users
router.post('/trigger/:resource', authMiddleware, requireAdmin, triggerSync);

// Temporary route to reset sync statuses for debugging
router.post('/reset-status', authMiddleware, requireAdmin, async (req, res) => {
  try {
    await prisma.syncStatus.deleteMany({});
    logger.info(`Sync statuses reset by user ${req.user.id}`);
    res.status(200).json({ message: 'All sync statuses have been reset.' });
  } catch (error) {
    logger.error('Failed to reset sync statuses:', error);
    res.status(500).json({ message: 'Failed to reset sync statuses.' });
  }
});

// Manual user photo sync endpoint
router.post('/user-photos', authMiddleware, requireAdmin, async (req, res) => {
  try {
    // Trigger user photo sync in the background
    syncUserPhotos().catch(err => {
      console.error('Background user photo sync failed:', err);
    });
    
    res.json({ 
      message: 'User photo sync started',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error starting user photo sync:', error);
    res.status(500).json({ error: 'Failed to start user photo sync' });
  }
});

module.exports = router; 