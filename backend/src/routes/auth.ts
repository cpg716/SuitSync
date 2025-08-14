import express from 'express';
import { login, logout, getSession, clearSession, getUserPhoto } from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';
import { redirectToLightspeed, handleCallback, testLightspeedConnection } from '../controllers/lightspeedAuthController';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

// Session management - NOTE: /session should NOT require auth middleware (circular dependency)
router.get('/session', asyncHandler(getSession));
router.get('/user-photo', asyncHandler(getUserPhoto)); // No auth required
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
// Alias for compatibility with docs and external references
router.get('/start', asyncHandler(redirectToLightspeed));

// Add debug logging to see if callback route is hit
router.get('/callback', asyncHandler(async (req, res, next) => {
  console.log("=== CALLBACK ROUTE HIT ===");
  console.log("URL:", req.url);
  console.log("Method:", req.method);
  console.log("Query:", req.query);
  console.log("Session:", req.session);
  return handleCallback(req, res);
}));

// Legacy local login endpoint (returns error directing to Lightspeed)
router.post('/login', asyncHandler(login));

// Development endpoint for testing Lightspeed API connection
router.get('/test-lightspeed', asyncHandler(testLightspeedConnection));

export default router; 