import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import logger from '../utils/logger';
import { PersistentUserSessionService } from '../services/persistentUserSessionService';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient().$extends(withAccelerate());

// SuitSync supports both Lightspeed OAuth (for admins) and local authentication (for other users)
export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({
      error: 'Email and password are required',
      supportsLightspeedOAuth: true
    });
    return;
  }

  try {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      res.status(401).json({
        error: 'Invalid email or password',
        supportsLightspeedOAuth: true
      });
      return;
    }

    // Check if user can login to SuitSync
    if (!user.canLoginToSuitSync) {
      res.status(403).json({
        error: 'This user account cannot login to SuitSync. Please use QR code workflows.',
        supportsLightspeedOAuth: true
      });
      return;
    }

    // Check if user is active
    if (!user.isActive) {
      res.status(403).json({
        error: 'User account is inactive',
        supportsLightspeedOAuth: true
      });
      return;
    }

    // Verify password
    if (!user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(401).json({
        error: 'Invalid email or password',
        supportsLightspeedOAuth: true
      });
      return;
    }

    // Set session data
    req.session.userId = user.id;
    req.session.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      photoUrl: user.photoUrl,
      lightspeedEmployeeId: user.lightspeedEmployeeId,
      isLocalUser: true
    };

    // Log successful login
    logger.info('Local user login successful', {
      userId: user.id,
      email: user.email,
      role: user.role,
      ip: req.ip
    });

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        photoUrl: user.photoUrl,
        lightspeedEmployeeId: user.lightspeedEmployeeId,
        isLocalUser: true
      }
    });

  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      error: 'Internal server error',
      supportsLightspeedOAuth: true
    });
  }
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

    // Check for local user authentication first
    if (req.session?.user && req.session.user.isLocalUser) {
      const localUser = req.session.user;

      logger.info('[AuthController] Found local user in session:', {
        id: localUser.id,
        name: localUser.name,
        email: localUser.email,
        role: localUser.role
      });

      const sessionResponse = {
        id: localUser.id,
        name: localUser.name,
        email: localUser.email,
        role: localUser.role,
         photoUrl: localUser.photoUrl,
        lightspeedEmployeeId: localUser.lightspeedEmployeeId,
        isLocalUser: true,
        lightspeed: {
          connected: false,
          domain: null,
          lastSync: null
        }
      };

      logger.info('[AuthController] Returning local user session response:', sessionResponse);
      res.json(sessionResponse);
      return;
    }

    // Check for Lightspeed user authentication
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

      const resolvedPhotoUrl = lightspeedUser.photoUrl || (lightspeedUser as any).image_source || (lightspeedUser as any).photo_url || (lightspeedUser as any).avatar || undefined;
      const sessionResponse = {
        id: lightspeedUser.id,
        name: lightspeedUser.name,
        email: lightspeedUser.email,
        role: lightspeedUser.role,
        photoUrl: resolvedPhotoUrl,
        lightspeedEmployeeId: lightspeedUser.lightspeedEmployeeId,
        isLightspeedUser: true,
        lightspeed: lightspeedStatus
      };

      logger.info('[AuthController] Returning lightspeedUser session response:', sessionResponse);
      res.json(sessionResponse);
      return;
    }

    // Check if we have tokens but no user data - try to restore from persistent session
    if (req.session?.lsAccessToken && req.session?.lsRefreshToken && req.session?.lsDomainPrefix && req.session?.userId) {
      logger.info('[AuthController] Found tokens but no user data, attempting to restore from persistent session');

      try {
        // Try to get user data from persistent session
        const userId = parseInt(String(req.session.userId || '0'));
        if (userId > 0) {
          const persistentSession = await PersistentUserSessionService.getActiveSession(userId);

          if (persistentSession) {
            logger.info('[AuthController] Found persistent session, restoring user data');

            // Get user details from the User table
            const user = await prisma.user.findUnique({
              where: { id: persistentSession.userId }
            });

            if (user) {
              // Restore user data in current session
              req.session.lightspeedUser = {
                id: user.lightspeedEmployeeId || String(user.id),
                lightspeedId: user.lightspeedEmployeeId || String(user.id),
                email: user.email,
                name: user.name,
                role: user.role,
                lightspeedEmployeeId: user.lightspeedEmployeeId,
                photoUrl: user.photoUrl,
                hasLocalRecord: true,
                localUserId: user.id
              };

              // Save the session
              await new Promise<void>((resolve, reject) => {
                req.session.save((err) => {
                  if (err) reject(err);
                  else resolve();
                });
              });

              // Return the restored user data
              const lightspeedStatus = {
                connected: !!req.session?.lsAccessToken,
                domain: req.session?.lsDomainPrefix || null,
                lastSync: req.session?.lastLightspeedSync || null
              };

              const sessionResponse = {
                id: user.lightspeedEmployeeId || String(user.id),
                name: user.name,
                email: user.email,
                role: user.role,
                photoUrl: user.photoUrl,
                lightspeedEmployeeId: user.lightspeedEmployeeId,
                isLightspeedUser: true,
                lightspeed: lightspeedStatus
              };

              logger.info('[AuthController] Returning restored lightspeedUser session response:', sessionResponse);
              res.json(sessionResponse);
              return;
            }
          }
        }
      } catch (error) {
        logger.error('[AuthController] Failed to restore user data from persistent session:', error);
      }
    }

    // No authenticated user found
    logger.info('[AuthController] No authenticated user found');
    res.status(401).json({
      error: 'Not authenticated',
      supportsLightspeedOAuth: true,
      supportsLocalAuth: true
    });

  } catch (error) {
    logger.error('[AuthController] getSession error:', error);
    res.status(500).json({
      error: 'Internal server error',
      supportsLightspeedOAuth: true,
      supportsLocalAuth: true
    });
  }
};

export const getUserPhoto = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.query;
    
    if (!email || typeof email !== 'string') {
      res.status(400).json({ error: 'Email parameter is required' });
      return;
    }

    // Find user by email and return their photo URL
    const user = await prisma.user.findFirst({
      where: { email: email.toLowerCase() },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        photoUrl: true,
        role: true 
      }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      photoUrl: user.photoUrl,
      role: user.role
    });

  } catch (error) {
    logger.error('Error fetching user photo:', error);
    res.status(500).json({ error: 'Failed to fetch user photo' });
  }
};