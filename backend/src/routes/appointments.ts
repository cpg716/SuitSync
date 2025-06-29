import express from 'express';
import * as appointmentsController from '../controllers/appointmentsController';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

router.use(authMiddleware);

router.get('/', asyncHandler(appointmentsController.listAppointments));
router.post('/', asyncHandler(appointmentsController.createAppointment));
router.put('/:id', asyncHandler(appointmentsController.updateAppointment));
router.delete('/:id', asyncHandler(appointmentsController.deleteAppointment));

export default router; 