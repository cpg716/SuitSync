import express from 'express';
import * as appointmentsController from '../controllers/appointmentsController';
import { authMiddleware, requirePermission } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

router.use(authMiddleware);

// Appointments are for Sales, Sales Management, Admin, and Sales Support (assign only)
router.get('/', asyncHandler(appointmentsController.listAppointments));
router.post('/', asyncHandler(appointmentsController.createAppointment));
router.put('/:id', asyncHandler(appointmentsController.updateAppointment));
router.delete('/:id', asyncHandler(appointmentsController.deleteAppointment));
router.get('/:id', asyncHandler(appointmentsController.getAppointment));

// Workflow management
router.post('/:id/trigger-workflow', requirePermission('appointments', 'write'), asyncHandler(appointmentsController.triggerWorkflow));
router.post('/schedule-next', requirePermission('appointments', 'write'), asyncHandler(appointmentsController.scheduleNextAppointmentController));

// Customer self-service actions (no authentication required for these endpoints)
router.post('/reschedule', asyncHandler(appointmentsController.rescheduleAppointment));
router.post('/cancel', asyncHandler(appointmentsController.cancelAppointment));

export default router; 