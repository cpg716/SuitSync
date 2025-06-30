import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

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

export const getSession = async (req: Request, res: Response): Promise<void> => {
  // Check if user is authenticated (either via session or JWT)
  if ((req as any).user) {
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: (req as any).user.id },
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
        res.status(401).json({ error: 'User not found' });
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