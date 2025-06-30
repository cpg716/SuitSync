import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import * as alterationsController from '../controllers/alterationsController';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// GET /api/alterations - Get all alterations
router.get('/', asyncHandler(alterationsController.listAlterations));

// POST /api/alterations - Create new alteration
router.post('/', asyncHandler(alterationsController.createAlteration));

// GET /api/alterations/:id - Get single alteration
router.get('/:id', asyncHandler(alterationsController.getAlteration));

// PUT /api/alterations/:id - Update alteration
router.put('/:id', asyncHandler(alterationsController.updateAlteration));

// DELETE /api/alterations/:id - Delete alteration
router.delete('/:id', asyncHandler(alterationsController.deleteAlteration));

// Additional routes for alteration jobs
router.get('/jobs', asyncHandler(alterationsController.getAlterationJobs));
router.post('/jobs', asyncHandler(alterationsController.createAlterationJob));
router.get('/jobs/:id', asyncHandler(alterationsController.getAlterationJob));
router.put('/jobs/:id', asyncHandler(alterationsController.updateAlterationJob));
router.delete('/jobs/:id', asyncHandler(alterationsController.deleteAlterationJob));

// QR Code scanning
router.post('/scan/:qrCode', asyncHandler(alterationsController.scanQRCode));
router.get('/scan-logs', asyncHandler(alterationsController.getScanLogs));

// Dashboard stats
router.get('/dashboard-stats', asyncHandler(alterationsController.getDashboardStats));

// Workflow management
router.put('/jobs/:jobId/workflow/:stepId', asyncHandler(alterationsController.updateWorkflowStep));

// Auto-assign tailors
router.post('/jobs/:id/auto-assign', asyncHandler(alterationsController.autoAssignTailors));

// Get alterations by member
router.get('/member/:memberId', asyncHandler(alterationsController.getAlterationsByMember));

export default router;