import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import { MultiUserSessionService } from '../services/multiUserSessionService';

const prisma = new PrismaClient().$extends(withAccelerate());
const DEMO = process.env.DEMO === 'true';

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // PURE LIGHTSPEED AUTHENTICATION ONLY - NO LEGACY FALLBACK

    // Check for pure Lightspeed user authentication (no database)
    if (req.session?.lightspeedUser) {
      const lightspeedUser = req.session.lightspeedUser;

      // Convert Lightspeed user to expected format for backward compatibility
      (req as any).user = {
        id: lightspeedUser.id,
        email: lightspeedUser.email,
        name: lightspeedUser.name,
        role: lightspeedUser.role,
        lightspeedEmployeeId: lightspeedUser.lightspeedEmployeeId,
        photoUrl: lightspeedUser.photoUrl,
        isLightspeedUser: true
      };

      // Check if Lightspeed connection is required and available
      const requiresLightspeed = ['/api/customers', '/api/sales', '/api/sync'].some(p => req.originalUrl.startsWith(p));
      if (requiresLightspeed && !req.session?.lsAccessToken) {
        return res.status(401).json({
          error: 'Lightspeed connection required for this action.',
          errorCode: 'LS_AUTH_REQUIRED',
          redirectTo: '/auth/start-lightspeed'
        });
      }

      return next();
    }

    // NO LEGACY AUTHENTICATION - Clear any old session data and require Lightspeed auth
    if (req.session && (req.session.activeUserId || req.session.userId || req.session.userSessions)) {
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

    // NO LEGACY AUTHENTICATION - Only pure Lightspeed authentication allowed

    // No authentication found
    return res.status(401).json({
      error: 'Authentication required. Please sign in with Lightspeed.',
      errorCode: 'AUTH_REQUIRED',
      redirectTo: '/login'
    });

  } catch (err) {
    console.error('Auth error:', err);
    return res.status(401).json({ error: 'Invalid authentication' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if ((req as any).user && (req as any).user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ error: 'Forbidden: Requires admin privileges' });
} 