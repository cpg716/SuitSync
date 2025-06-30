import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import { MultiUserSessionService } from '../services/multiUserSessionService';

const prisma = new PrismaClient().$extends(withAccelerate());
const DEMO = process.env.DEMO === 'true';

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // Check for session-based authentication (both legacy and multi-user)
    const activeUserId = req.session?.activeUserId || req.session?.userId;

    if (activeUserId && typeof activeUserId === 'number') {
      const user = await prisma.user.findUnique({
        where: { id: activeUserId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          lightspeedEmployeeId: true
        }
      });

      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      (req as any).user = user;

      // Ensure session tokens are available for multi-user session
      if (req.session?.activeUserId && req.session?.userSessions) {
        const userSession = req.session.userSessions[activeUserId];
        if (userSession) {
          // Update legacy session properties for backward compatibility
          req.session.lsAccessToken = userSession.lsAccessToken;
          req.session.lsRefreshToken = userSession.lsRefreshToken;
          req.session.lsDomainPrefix = userSession.lsDomainPrefix;
        }
      }

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

    // Legacy session check for backward compatibility
    if (req.session?.userId && typeof req.session.userId === 'number') {
      const userId: number = req.session.userId;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          lightspeedEmployeeId: true
        }
      });

      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      (req as any).user = user;

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

    // Fallback: Check for JWT token (for API access)
    let token = req.cookies.token;
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'changeme';
      const decoded = jwt.verify(token, secret) as { id: string };
      const userId = typeof decoded.id === 'string' ? parseInt(decoded.id, 10) : decoded.id;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          lightspeedEmployeeId: true
        }
      });

      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      (req as any).user = user;
      return next();
    }

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