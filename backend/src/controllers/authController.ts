import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import logger from '../utils/logger';

const prisma = new PrismaClient().$extends(withAccelerate());

// SuitSync uses Lightspeed OAuth only - no local login
export const login = async (req: Request, res: Response): Promise<void> => {
  res.status(400).json({
    error: 'Local login is not supported. Please use Lightspeed OAuth.',
    redirectTo: '/auth/start-lightspeed'
  });
};



export const logout = async (req: Request, res: Response): Promise<void> => {
  // Clear any JWT cookies (if they exist)
  res.clearCookie('token', { path: '/' });

  // Destroy the session (this clears Lightspeed tokens and user session)
  if (req.session) {
    await new Promise<void>(resolve => req.session.destroy(() => resolve()));
  }

  res.json({ message: 'Logged out successfully' });
};

export const clearSession = async (req: Request, res: Response): Promise<void> => {
  try {
    // Clear any JWT cookies
    res.clearCookie('token', { path: '/' });

    // Clear session data but keep the session ID
    if (req.session) {
      // Clear all session data
      Object.keys(req.session).forEach(key => {
        if (key !== 'id' && key !== 'cookie') {
          delete (req.session as any)[key];
        }
      });

      // Save the cleared session
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    logger.info('Session cleared successfully', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.json({
      message: 'Session cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error clearing session:', error);
    res.status(500).json({ error: 'Failed to clear session' });
  }
};

export const getSession = async (req: Request, res: Response): Promise<void> => {
  try {
    logger.info('[AuthController] getSession called');
    logger.info('[AuthController] Session keys:', req.session ? Object.keys(req.session) : 'No session');

    // Check for pure Lightspeed user authentication first
    if (req.session?.lightspeedUser) {
      const lightspeedUser = req.session.lightspeedUser;

      logger.info('[AuthController] Found lightspeedUser in session:', {
        id: lightspeedUser.id,
        name: lightspeedUser.name,
        email: lightspeedUser.email,
        role: lightspeedUser.role
      });

      // Include Lightspeed connection status
      const lightspeedStatus = {
        connected: !!req.session?.lsAccessToken,
        domain: req.session?.lsDomainPrefix || null,
        lastSync: req.session?.lastLightspeedSync || null
      };

      const sessionResponse = {
        id: lightspeedUser.id,
        name: lightspeedUser.name,
        email: lightspeedUser.email,
        role: lightspeedUser.role,
        photoUrl: lightspeedUser.photoUrl,
        lightspeedEmployeeId: lightspeedUser.lightspeedEmployeeId,
        isLightspeedUser: true,
        lightspeed: lightspeedStatus
      };

      logger.info('[AuthController] Returning lightspeedUser session response:', sessionResponse);
      res.json(sessionResponse);
      return;
    }

    // NO LEGACY AUTHENTICATION - Clear any old session data and require Lightspeed auth
    if (req.session && (req.session.activeUserId || req.session.userId || req.session.userSessions)) {
      logger.info('[AuthController] Found legacy session data, clearing and requiring re-authentication');

      // Clear legacy session data
      delete req.session.activeUserId;
      delete req.session.userId;
      delete req.session.userSessions;
      delete req.session.maxCachedUsers;

      // Save the cleared session
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    // No valid Lightspeed session - require authentication
    logger.info('[AuthController] No lightspeedUser in session - requiring Lightspeed authentication');
    res.status(401).json({
      error: 'Lightspeed authentication required. Please sign in with Lightspeed.',
      errorCode: 'LS_AUTH_REQUIRED',
      redirectTo: '/auth/start-lightspeed'
    });
  } catch (error) {
    console.error('Error fetching user session data:', error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
};