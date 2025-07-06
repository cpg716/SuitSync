import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { MultiUserSessionService } from '../services/multiUserSessionService';
import { PinService } from '../services/pinService';
import logger from '../utils/logger';

const prisma = new PrismaClient();

/**
 * Switch to a different cached user
 */
export const switchUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.body;

    if (!userId || typeof userId !== 'number') {
      res.status(400).json({ 
        error: 'Invalid userId provided',
        success: false 
      });
      return;
    }

    // Verify the user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (!targetUser) {
      res.status(404).json({ 
        error: 'User not found',
        success: false 
      });
      return;
    }

    // Attempt to switch to the user
    const success = await MultiUserSessionService.switchToUser(req, userId);

    if (success) {
      // Fetch the new user from DB for session update
      const switchedUser = await prisma.user.findUnique({ where: { id: userId } });
      if (switchedUser) {
        req.session.lightspeedUser = {
          id: switchedUser.id,
          name: switchedUser.name,
          email: switchedUser.email,
          role: switchedUser.role,
          photoUrl: switchedUser.photoUrl,
          lightspeedEmployeeId: switchedUser.lightspeedEmployeeId,
          isLightspeedUser: true,
          hasLocalRecord: true,
          localUserId: switchedUser.id
        };
        req.session.userId = switchedUser.id;
        req.session.activeUserId = switchedUser.id;
        // Tokens and domain are already set by MultiUserSessionService.switchToUser
        await new Promise<void>((resolve, reject) => req.session.save(err => err ? reject(err) : resolve()));
        logger.info('[UserSwitch] Session fields updated and saved for user', { userId: switchedUser.id });
      }
      logger.info(`Successfully switched to user ${userId} (${targetUser.email})`);
      res.json({
        success: true,
        message: `Switched to ${targetUser.name}`,
        user: targetUser,
      });
      return;
    } else {
      logger.warn(`Failed to switch to user ${userId} - not in cache`);
      res.status(401).json({
        success: false,
        requiresAuth: true,
        message: 'User session not found in cache. Authentication required.',
        authUrl: `/api/auth/start-lightspeed?targetUserId=${userId}`,
      });
    }
  } catch (error) {
    logger.error('Error switching user:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      success: false 
    });
  }
};

/**
 * Get list of cached users for the current session
 */
export const getCachedUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const cachedUsers = await MultiUserSessionService.getCachedUsers(req);
    const activeUserId = req.session.activeUserId || req.session.userId;

    res.json({
      success: true,
      users: cachedUsers,
      activeUserId,
      totalCached: cachedUsers.length,
    });
  } catch (error) {
    logger.error('Error getting cached users:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      success: false 
    });
  }
};

/**
 * Remove a user from the session cache
 */
export const removeUserFromCache = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const userIdNum = parseInt(userId, 10);

    if (isNaN(userIdNum)) {
      res.status(400).json({ 
        error: 'Invalid userId provided',
        success: false 
      });
      return;
    }

    // Don't allow removing the currently active user
    const activeUserId = req.session.activeUserId || req.session.userId;
    if (activeUserId === userIdNum) {
      res.status(400).json({ 
        error: 'Cannot remove the currently active user from cache',
        success: false 
      });
      return;
    }

    await MultiUserSessionService.removeUserSession(req, userIdNum);

    logger.info(`Removed user ${userIdNum} from session cache`);
    res.json({
      success: true,
      message: 'User removed from cache',
    });
  } catch (error) {
    logger.error('Error removing user from cache:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      success: false 
    });
  }
};

/**
 * Get current session status and active user info
 */
export const getSessionStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    // For pure Lightspeed authentication, return simple session status
    if (req.session?.lightspeedUser) {
      const lightspeedUser = req.session.lightspeedUser;
      res.json({
        success: true,
        activeUser: {
          id: lightspeedUser.id,
          name: lightspeedUser.name,
          email: lightspeedUser.email,
          role: lightspeedUser.role,
          photoUrl: lightspeedUser.photoUrl,
        },
        totalCached: 1, // Only one user (current Lightspeed user)
        cachedUsers: [lightspeedUser]
      });
      return;
    }

    // Legacy: Database user session
    const activeUserId = req.session.activeUserId || req.session.userId;
    const cachedUsers = await MultiUserSessionService.getCachedUsers(req);

    let activeUser = null;
    if (activeUserId && typeof activeUserId === 'number') {
      activeUser = await prisma.user.findUnique({
        where: { id: activeUserId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          photoUrl: true,
        },
      });
    }

    const currentSession = MultiUserSessionService.getCurrentUserSession(req);

    res.json({
      success: true,
      activeUser,
      activeUserId,
      cachedUsers,
      totalCached: cachedUsers.length,
      sessionInfo: currentSession ? {
        domain: currentSession.lsDomainPrefix,
        expiresAt: currentSession.expiresAt,
        lastActive: currentSession.lastActive,
      } : null,
    });
  } catch (error) {
    logger.error('Error getting session status:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      success: false 
    });
  }
};

/**
 * Clear all cached users (logout all)
 */
export const clearAllCachedUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const cachedUsers = await MultiUserSessionService.getCachedUsers(req);
    
    // Remove all cached users
    for (const user of cachedUsers) {
      await MultiUserSessionService.removeUserSession(req, user.id);
    }

    // Clear session data
    req.session.activeUserId = undefined;
    req.session.userId = undefined;
    req.session.userSessions = undefined;
    req.session.lsAccessToken = undefined;
    req.session.lsRefreshToken = undefined;
    req.session.lsDomainPrefix = undefined;

    logger.info(`Cleared all cached users (${cachedUsers.length} users)`);
    res.json({
      success: true,
      message: `Cleared ${cachedUsers.length} cached users`,
      clearedCount: cachedUsers.length,
    });
  } catch (error) {
    logger.error('Error clearing all cached users:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      success: false 
    });
  }
};

/**
 * Refresh tokens for a specific user session
 */
export const refreshUserSession = async (req: Request, res: Response): Promise<void> => {
  try {
    // For pure Lightspeed authentication, token refresh is handled automatically
    if (req.session?.lightspeedUser) {
      res.json({
        success: true,
        message: 'Lightspeed tokens are refreshed automatically'
      });
      return;
    }

    // Legacy: Database user session refresh
    const { userId } = req.body;

    if (!userId || typeof userId !== 'number') {
      res.status(400).json({
        error: 'Invalid userId provided',
        success: false
      });
      return;
    }

    // Check if user is in cache
    const cachedUsers = await MultiUserSessionService.getCachedUsers(req);
    const userInCache = cachedUsers.find(u => u.id === userId);

    if (!userInCache) {
      res.status(404).json({ 
        error: 'User not found in session cache',
        success: false 
      });
      return;
    }

    // Switch to this user temporarily to refresh tokens
    const currentActiveUserId = req.session.activeUserId || req.session.userId;
    const switched = await MultiUserSessionService.switchToUser(req, userId);

    if (!switched) {
      res.status(500).json({ 
        error: 'Failed to switch to user for token refresh',
        success: false 
      });
      return;
    }

    // The token refresh will happen automatically on the next API call
    // For now, just update the last active time
    const currentSession = MultiUserSessionService.getCurrentUserSession(req);
    
    // Switch back to original user if different (legacy only)
    if (currentActiveUserId && typeof currentActiveUserId === 'number' && typeof userId === 'number' && currentActiveUserId !== userId) {
      await MultiUserSessionService.switchToUser(req, currentActiveUserId);
    }

    res.json({
      success: true,
      message: 'User session refreshed',
      sessionInfo: currentSession ? {
        domain: currentSession.lsDomainPrefix,
        expiresAt: currentSession.expiresAt,
        lastActive: currentSession.lastActive,
      } : null,
    });
  } catch (error) {
    logger.error('Error refreshing user session:', error);
    res.status(500).json({
      error: 'Internal server error',
      success: false
    });
  }
};

/**
 * Switch user using PIN
 */
export const switchUserWithPin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, pin } = req.body;

    if (!userId || !pin) {
      res.status(400).json({
        error: 'userId and pin are required',
        success: false
      });
      return;
    }

    if (typeof userId !== 'number' || typeof pin !== 'string') {
      res.status(400).json({
        error: 'Invalid userId or pin format',
        success: false
      });
      return;
    }

    // Validate PIN
    const pinResult = await PinService.validatePin(userId, pin);

    if (!pinResult.success) {
      res.status(401).json({
        success: false,
        error: pinResult.error,
        attemptsRemaining: pinResult.attemptsRemaining,
        lockedUntil: pinResult.lockedUntil
      });
      return;
    }

    // Switch to the user
    const success = await MultiUserSessionService.switchToUser(req, userId);

    if (success) {
      logger.info(`Successfully switched to user ${userId} using PIN`);
      res.json({
        success: true,
        message: `Switched to ${pinResult.user?.name}`,
        user: {
          id: pinResult.user.id,
          name: pinResult.user.name,
          email: pinResult.user.email,
          role: pinResult.user.role,
        },
      });
    } else {
      logger.warn(`Failed to switch to user ${userId} - not in cache`);
      res.status(401).json({
        success: false,
        requiresAuth: true,
        message: 'User session not found in cache. Full authentication required.',
        authUrl: `/api/auth/start-lightspeed?targetUserId=${userId}`,
      });
    }
  } catch (error) {
    logger.error('Error switching user with PIN:', error);
    res.status(500).json({
      error: 'Internal server error',
      success: false
    });
  }
};

/**
 * Set PIN for current user
 */
export const setUserPin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pin } = req.body;
    const currentUser = (req as any).user;

    if (!currentUser || !currentUser.localUserId) {
      res.status(401).json({
        error: 'Authentication required and user must have local record',
        success: false
      });
      return;
    }

    if (!pin || typeof pin !== 'string') {
      res.status(400).json({
        error: 'PIN is required',
        success: false
      });
      return;
    }

    const result = await PinService.setPin(currentUser.localUserId, pin);

    if (result.success) {
      logger.info(`PIN set for user ${currentUser.localUserId}`);
      res.json({
        success: true,
        message: 'PIN set successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Error setting user PIN:', error);
    res.status(500).json({
      error: 'Internal server error',
      success: false
    });
  }
};

/**
 * Remove PIN for current user
 */
export const removeUserPin = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUser = (req as any).user;

    if (!currentUser || !currentUser.localUserId) {
      res.status(401).json({
        error: 'Authentication required and user must have local record',
        success: false
      });
      return;
    }

    const result = await PinService.removePin(currentUser.localUserId);

    if (result.success) {
      logger.info(`PIN removed for user ${currentUser.localUserId}`);
      res.json({
        success: true,
        message: 'PIN removed successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Error removing user PIN:', error);
    res.status(500).json({
      error: 'Internal server error',
      success: false
    });
  }
};

/**
 * Get PIN info for current user
 */
export const getUserPinInfo = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUser = (req as any).user;

    if (!currentUser || !currentUser.localUserId) {
      res.status(401).json({
        error: 'Authentication required and user must have local record',
        success: false
      });
      return;
    }

    const pinInfo = await PinService.getPinInfo(currentUser.localUserId);

    res.json({
      success: true,
      pinInfo
    });
  } catch (error) {
    logger.error('Error getting user PIN info:', error);
    res.status(500).json({
      error: 'Internal server error',
      success: false
    });
  }
};
