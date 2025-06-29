import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient().$extends(withAccelerate());
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';
const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

// Local, non-Lightspeed login
export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    res.status(401).json({ error: 'Invalid credentials or user does not have a local password.' });
    return;
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials.' });
    return;
  }
  const jwtToken = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
  res.cookie('token', jwtToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000,
  });
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  res.clearCookie('token', { path: '/' });
  if (req.session) {
    await new Promise<void>(resolve => req.session.destroy(() => resolve()));
  }
  res.json({ message: 'Logged out successfully' });
};

export const getSession = async (req: Request, res: Response): Promise<void> => {
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
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
}; 