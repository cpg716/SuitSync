import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import {
  switchUser,
  getCachedUsers,
  removeUserFromCache,
  getSessionStatus,
  clearAllCachedUsers,
  refreshUserSession,
  switchUserWithPin,
  setUserPin,
  removeUserPin,
  getUserPinInfo
} from '../controllers/userSwitchController';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Switch to a different cached user
router.post('/switch-user', asyncHandler(switchUser));

// Get list of cached users
router.get('/cached-users', asyncHandler(getCachedUsers));

// Get current session status
router.get('/session-status', asyncHandler(getSessionStatus));

// Remove a specific user from cache
router.delete('/cached-users/:userId', asyncHandler(removeUserFromCache));

// Clear all cached users (logout all)
router.delete('/cached-users', asyncHandler(clearAllCachedUsers));

// Refresh tokens for a specific user
router.post('/refresh-user-session', asyncHandler(refreshUserSession));

// PIN-based user switching
router.post('/switch-user-pin', asyncHandler(switchUserWithPin));
router.post('/set-pin', asyncHandler(setUserPin));
router.delete('/pin', asyncHandler(removeUserPin));
router.get('/pin-info', asyncHandler(getUserPinInfo));

export default router;
