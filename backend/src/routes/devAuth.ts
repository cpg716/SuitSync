import express from 'express';
import { devAuth, devLogout } from '../controllers/devAuthController';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

// Development authentication routes (only for development)
router.post('/dev-auth', asyncHandler(devAuth));
router.post('/dev-logout', asyncHandler(devLogout));

export default router; 