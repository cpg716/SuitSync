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
    // Check for session-based authentication (same logic as auth middleware)
    const activeUserId = req.session?.activeUserId || req.session?.userId;

    if (!activeUserId || typeof activeUserId !== 'number') {
      // No valid session
      res.status(401).json({
        error: 'Authentication required. Please sign in with Lightspeed.',
        errorCode: 'AUTH_REQUIRED',
        redirectTo: '/login'
      });
      return;
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: activeUserId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        photoUrl: true,
        lightspeedEmployeeId: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!dbUser) {
      res.status(401).json({
        error: 'User not found',
        errorCode: 'USER_NOT_FOUND',
        redirectTo: '/login'
      });
      return;
    }

      // Include Lightspeed connection status
      const lightspeedStatus = {
        connected: !!req.session?.lsAccessToken,
        domain: req.session?.lsDomainPrefix || null,
        lastSync: req.session?.lastLightspeedSync || null
      };

      res.json({
        ...dbUser,
        lightspeed: lightspeedStatus
      });
      return;
    } catch (error) {
      console.error('Error fetching user session data:', error);
      res.status(500).json({ error: 'Failed to fetch user data' });
      return;
    }
  } else {
    res.status(401).json({
      error: 'Not authenticated. Please sign in with Lightspeed.',
      redirectTo: '/login'
    });
    return;
  }
};