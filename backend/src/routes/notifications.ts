import express from 'express';
import { sendEmailNotification, sendSMSNotification } from '../controllers/notificationController';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

router.use(authMiddleware);

router.post('/email', asyncHandler(sendEmailNotification));
router.post('/sms', asyncHandler(sendSMSNotification));

export default router; 