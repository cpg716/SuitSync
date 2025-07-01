import express from 'express';
import { login, logout, getSession, clearSession } from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';
import { redirectToLightspeed, handleCallback } from '../controllers/lightspeedAuthController';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

// Session management - NOTE: /session should NOT require auth middleware (circular dependency)
router.get('/session', asyncHandler(getSession));
router.post('/logout', asyncHandler(logout));

// Debug endpoint to check session health
router.get('/session-debug', asyncHandler(async (req, res) => {
  const sessionSize = req.session ? Buffer.byteLength(JSON.stringify(req.session), 'utf8') : 0;
  const sessionKeys = req.session ? Object.keys(req.session) : [];

  res.json({
    hasSession: !!req.session,
    sessionId: req.sessionID,
    sessionSize,
    sessionKeys,
    userSessions: req.session?.userSessions ? Object.keys(req.session.userSessions).length : 0,
    activeUserId: req.session?.activeUserId,
    hasLsToken: !!req.session?.lsAccessToken,
    maxAge: req.session?.cookie?.maxAge,
    expires: req.session?.cookie?.expires
  });
}));
router.post('/clear-session', asyncHandler(clearSession));



// Lightspeed OAuth (primary authentication method)
router.get('/start-lightspeed', asyncHandler(redirectToLightspeed));
router.get('/callback', asyncHandler(handleCallback));

// Legacy local login endpoint (returns error directing to Lightspeed)
router.post('/login', asyncHandler(login));

export default router; 