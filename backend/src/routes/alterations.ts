import express from 'express';
import { authMiddleware, requirePermission } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import * as alterationsController from '../controllers/alterationsController';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Alterations are primarily for Tailors, with Sales Support able to assign
// GET /api/alterations - Get all alterations (Tailors can read, others with assign permission)
router.get('/', requirePermission('alterations', 'read'), asyncHandler(alterationsController.listAlterations));

// POST /api/alterations - Create new alteration (Tailors only)
router.post('/', requirePermission('alterations', 'write'), asyncHandler(alterationsController.createAlteration));

// GET /api/alterations/:id - Get single alteration
router.get('/:id', requirePermission('alterations', 'read'), asyncHandler(alterationsController.getAlteration));

// PUT /api/alterations/:id - Update alteration (Tailors only)
router.put('/:id', requirePermission('alterations', 'write'), asyncHandler(alterationsController.updateAlteration));

// DELETE /api/alterations/:id - Delete alteration (Tailors only)
router.delete('/:id', requirePermission('alterations', 'write'), asyncHandler(alterationsController.deleteAlteration));

// Additional routes for alteration jobs
router.get('/jobs', requirePermission('alterations', 'read'), asyncHandler(alterationsController.getAlterationJobs));
router.post('/jobs', requirePermission('alterations', 'write'), asyncHandler(alterationsController.createAlterationJob));
router.get('/jobs/:id', requirePermission('alterations', 'read'), asyncHandler(alterationsController.getAlterationJob));
router.put('/jobs/:id', requirePermission('alterations', 'write'), asyncHandler(alterationsController.updateAlterationJob));
router.delete('/jobs/:id', requirePermission('alterations', 'write'), asyncHandler(alterationsController.deleteAlterationJob));

// QR Code scanning (Tailors only)
router.post('/scan/:qrCode', requirePermission('alterations', 'write'), asyncHandler(alterationsController.scanQRCode));
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