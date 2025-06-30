import express from 'express';
import { login, logout, getSession } from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';
import { redirectToLightspeed, handleCallback } from '../controllers/lightspeedAuthController';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

// Session management
router.get('/session', authMiddleware, asyncHandler(getSession));
router.post('/logout', asyncHandler(logout));

// Lightspeed OAuth (primary authentication method)
router.get('/start-lightspeed', asyncHandler(redirectToLightspeed));
router.get('/callback', asyncHandler(handleCallback));

// Legacy local login endpoint (returns error directing to Lightspeed)
router.post('/login', asyncHandler(login));

export default router; 