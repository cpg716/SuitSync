import express from 'express';
import { login, logout, getSession } from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';
import { redirectToLightspeed, handleCallback } from '../controllers/lightspeedAuthController';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

// Local auth
router.post('/login', asyncHandler(login));
router.get('/session', authMiddleware, asyncHandler(getSession));
router.post('/logout', asyncHandler(logout));

// Lightspeed OAuth
router.get('/start-lightspeed', asyncHandler(redirectToLightspeed));
router.get('/callback', asyncHandler(handleCallback));

export default router; 