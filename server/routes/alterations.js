const express = require('express');
const router = express.Router();
const alterationsController = require('../controllers/alterationsController');
const { authMiddleware } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Existing routes
router.get('/', alterationsController.listAlterations);
router.post('/', alterationsController.createAlteration);
router.get('/:id', alterationsController.getAlteration);
router.put('/:id', alterationsController.updateAlteration);
router.delete('/:id', alterationsController.deleteAlteration);

// New comprehensive garment alteration tag system routes
router.post('/jobs', alterationsController.createAlterationJob);
router.get('/jobs', alterationsController.getAlterationJobs);
router.get('/jobs/:id', alterationsController.getAlterationJob);
router.put('/jobs/:id', alterationsController.updateAlterationJob);
router.delete('/jobs/:id', alterationsController.deleteAlterationJob);

// QR Code scanning and tracking
router.post('/scan/:qrCode', alterationsController.scanQRCode);
router.get('/scan-logs', alterationsController.getScanLogs);

// Dashboard and analytics
router.get('/dashboard/stats', alterationsController.getDashboardStats);

// Workflow management
router.put('/jobs/:jobId/workflow/:stepId', alterationsController.updateWorkflowStep);

// Add auto-assign endpoint
router.post('/jobs/:id/auto-assign', alterationsController.autoAssignTailors);

module.exports = router;