import express from 'express';
import * as appointmentsController from '../controllers/appointmentsController';
import { authMiddleware, requirePermission } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

router.use(authMiddleware);

// Appointments are for Sales, Sales Management, Admin, and Sales Support (assign only)
router.get('/', requirePermission('appointments', 'read'), asyncHandler(appointmentsController.listAppointments));
router.post('/', requirePermission('appointments', 'write'), asyncHandler(appointmentsController.createAppointment));
router.put('/:id', requirePermission('appointments', 'write'), asyncHandler(appointmentsController.updateAppointment));
router.delete('/:id', requirePermission('appointments', 'write'), asyncHandler(appointmentsController.deleteAppointment));

export default router; 