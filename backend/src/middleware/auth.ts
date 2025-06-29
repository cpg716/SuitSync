import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

const prisma = new PrismaClient().$extends(withAccelerate());
const DEMO = process.env.DEMO === 'true';

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    let token = req.cookies.token;
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const secret = process.env.SESSION_SECRET || 'changeme';
    const decoded = jwt.verify(token, secret) as { id: string };
    const user = await prisma.user.findUnique({
      where: { id: typeof decoded.id === 'string' ? Number(decoded.id) : decoded.id },
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
    const requiresLightspeed = ['/api/customers', '/api/sales', '/api/sync'].some(p => req.originalUrl.startsWith(p));
    if (requiresLightspeed && !req.session?.lsAccessToken) {
      return res.status(401).json({ 
        error: 'Lightspeed connection required for this action.',
        errorCode: 'LS_AUTH_REQUIRED',
        redirectTo: '/lightspeed-account'
      });
    }
    return next();
  } catch (err) {
    console.error('Auth error:', err);
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if ((req as any).user && (req as any).user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ error: 'Forbidden: Requires admin privileges' });
} 