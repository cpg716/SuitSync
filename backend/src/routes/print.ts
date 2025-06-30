import express from 'express';
import { printTag } from '../controllers/printController';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

router.use(authMiddleware);

router.post('/tag', asyncHandler(printTag));

export default router; 