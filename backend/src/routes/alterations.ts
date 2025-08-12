import express from 'express';
import { authMiddleware, requirePermission, attachUserIfAvailable } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import * as alterationsController from '../controllers/alterationsController';
// removed duplicate imports
import SchedulingService from '../services/alterationSchedulingService.js';

const router = express.Router();

// Attach user if available; enforce auth where needed per-route
router.use(attachUserIfAvailable);

// Alterations are primarily for Tailors, with Sales Support able to assign
// GET /api/alterations - Get all alterations (Tailors can read, others with assign permission)
router.get('/', requirePermission('alterations', 'read'), asyncHandler(alterationsController.listAlterations));

// POST /api/alterations - Create new alteration (Tailors only)
router.post('/', requirePermission('alterations', 'write'), asyncHandler(alterationsController.createAlteration));

// GET /api/alterations/:id - Get single alteration (numeric id only to avoid clashing with /jobs)
router.get('/:id(\\d+)', requirePermission('alterations', 'read'), asyncHandler(alterationsController.getAlteration));

// PUT /api/alterations/:id - Update alteration (Tailors only)
router.put('/:id(\\d+)', requirePermission('alterations', 'write'), asyncHandler(alterationsController.updateAlteration));

// DELETE /api/alterations/:id - Delete alteration (Tailors only)
router.delete('/:id(\\d+)', requirePermission('alterations', 'write'), asyncHandler(alterationsController.deleteAlteration));

// Additional routes for alteration jobs
// Raw list (legacy)
router.get('/jobs/raw', requirePermission('alterations', 'read'), asyncHandler(alterationsController.getAlterationJobs));
router.post('/jobs', requirePermission('alterations', 'write'), asyncHandler(alterationsController.createAlterationsJob));
router.get('/jobs/:id', requirePermission('alterations', 'read'), asyncHandler(alterationsController.getAlterationsJob));
router.put('/jobs/:id', requirePermission('alterations', 'write'), asyncHandler(alterationsController.updateAlterationJob));
router.delete('/jobs/:id', requirePermission('alterations', 'write'), asyncHandler(alterationsController.deleteAlterationJob));

// QR Code scanning (Tailors only)
router.post('/scan/:qrCode', requirePermission('alterations', 'write'), asyncHandler(alterationsController.scanQRCode));
router.get('/scan-logs', asyncHandler(alterationsController.getScanLogs));

// Dashboard stats
router.get('/dashboard-stats', asyncHandler(alterationsController.getDashboardStats));

// Alias for legacy frontend path
router.get('/dashboard/stats', asyncHandler(alterationsController.getDashboardStats));

// Workflow management
router.put('/jobs/:jobId/workflow/:stepId', requirePermission('alterations', 'write'), asyncHandler(alterationsController.updateWorkflowStep));

// Auto-assign tailors
router.post('/jobs/:id/auto-assign', requirePermission('alterations', 'write'), asyncHandler(alterationsController.autoAssignTailors));

// Get alterations by member
router.get('/member/:memberId', requirePermission('alterations', 'read'), asyncHandler(alterationsController.getAlterationsByMember));

// Scan QR code to mark part as started/finished
router.post('/scan', requirePermission('alterations', 'write'), asyncHandler(alterationsController.scanQRCode));

// Schedule pickup date
router.post('/pickup', requirePermission('alterations', 'write'), asyncHandler(alterationsController.schedulePickup));

// Generate alterations ticket for printing
router.get('/jobs/:jobId/ticket', requirePermission('alterations', 'read'), asyncHandler(alterationsController.generateAlterationsTicket));

// Get all alterations with status and due dates (primary)
router.get('/jobs', asyncHandler(alterationsController.getAllAlterations));

// Update alteration due date
router.put('/jobs/:jobId/due-date', requirePermission('alterations', 'write'), asyncHandler(alterationsController.updateAlterationDueDate));

// Scheduling endpoints
router.post('/jobs/:jobId/schedule', requirePermission('alterations', 'write'), asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const results = await SchedulingService.scheduleJobParts(Number(jobId), { respectNoThursday: true });
  res.json({ success: true, results });
}));

router.post('/schedule/rebalance', requirePermission('alterations', 'write'), asyncHandler(async (req, res) => {
  const { date } = req.body;
  await SchedulingService.rebalanceDay(new Date(date));
  res.json({ success: true });
}));

router.post('/schedule/auto', requirePermission('alterations', 'write'), asyncHandler(async (req, res) => {
  const count = await SchedulingService.bulkAutoScheduleUnplanned();
  res.json({ success: true, scheduledJobs: count });
}));

// Work Day board
router.get('/board', requirePermission('alterations', 'read'), asyncHandler(alterationsController.getWorkDayBoard));
router.get('/board/:date', requirePermission('alterations', 'read'), asyncHandler(alterationsController.getWorkDayItems));

// Tailor assignment and work tracking
router.post('/parts/:partId/assign', requirePermission('alterations', 'write'), asyncHandler(alterationsController.assignTailorToPart));
router.post('/tasks/:taskId/start', requirePermission('alterations', 'write'), asyncHandler(alterationsController.startTask));
router.post('/tasks/:taskId/finish', requirePermission('alterations', 'write'), asyncHandler(alterationsController.finishTask));
router.get('/available-tailors', requirePermission('alterations', 'read'), asyncHandler(alterationsController.getAvailableTailors));
router.get('/jobs/:jobId/history', requirePermission('alterations', 'read'), asyncHandler(alterationsController.getAlterationJobHistory));

// Manual scheduling for a part (supports last-minute Thursday when flagged)
router.post('/parts/:partId/schedule', requirePermission('alterations', 'write'), asyncHandler(alterationsController.schedulePartManual));

export default router;