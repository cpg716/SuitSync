import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import logger from '../utils/logger';

const prisma = new PrismaClient().$extends(withAccelerate());

const LS_PERSONAL_ACCESS_TOKEN = process.env.LS_PERSONAL_ACCESS_TOKEN;
const LS_DOMAIN = process.env.LS_DOMAIN;
const LS_ACCOUNT_ID = process.env.LS_ACCOUNT_ID;

/**
 * Development authentication endpoint that uses personal access token
 * This is for development/testing only and should not be used in production
 */
export const devAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      res.status(403).json({ error: 'Development authentication not allowed in production' });
      return;
    }

    if (!LS_PERSONAL_ACCESS_TOKEN || !LS_DOMAIN) {
      res.status(400).json({ 
        error: 'Missing Lightspeed credentials',
        required: ['LS_PERSONAL_ACCESS_TOKEN', 'LS_DOMAIN']
      });
      return;
    }

    // Create a mock Lightspeed user session
    const mockLightspeedUser = {
      id: LS_ACCOUNT_ID || 'dev-user-1',
      lightspeedId: LS_ACCOUNT_ID || 'dev-user-1',
      email: 'dev@riversidemens.com',
      name: 'Development User',
      role: 'admin',
      lightspeedEmployeeId: LS_ACCOUNT_ID || 'dev-user-1',
      photoUrl: null,
      isLightspeedUser: true,
      hasLocalRecord: false,
      localUserId: null,
      commissionRate: 0.1,
      tailorAbilities: [],
      tailorSchedules: [],
      skills: [],
      notificationPrefs: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Set up session with personal token
    req.session.lightspeedUser = mockLightspeedUser;
    req.session.lsAccessToken = LS_PERSONAL_ACCESS_TOKEN;
    req.session.lsRefreshToken = LS_PERSONAL_ACCESS_TOKEN; // Use same token for refresh
    req.session.lsDomainPrefix = LS_DOMAIN;

    // Store token in database for sync operations
    await prisma.apiToken.upsert({
      where: { service: 'lightspeed' },
      update: {
        accessToken: LS_PERSONAL_ACCESS_TOKEN,
        refreshToken: LS_PERSONAL_ACCESS_TOKEN,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      },
      create: {
        service: 'lightspeed',
        accessToken: LS_PERSONAL_ACCESS_TOKEN,
        refreshToken: LS_PERSONAL_ACCESS_TOKEN,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      },
    });

    logger.info('Development authentication successful', {
      userId: mockLightspeedUser.id,
      domain: LS_DOMAIN,
      environment: process.env.NODE_ENV
    });

    res.json({
      success: true,
      user: mockLightspeedUser,
      message: 'Development authentication successful',
      environment: process.env.NODE_ENV
    });

  } catch (error) {
    logger.error('Development authentication failed:', error);
    res.status(500).json({ 
      error: 'Development authentication failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Clear development authentication
 */
export const devLogout = async (req: Request, res: Response): Promise<void> => {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      res.status(403).json({ error: 'Development logout not allowed in production' });
      return;
    }

    // Clear session
    if (req.session) {
      delete req.session.lightspeedUser;
      delete req.session.lsAccessToken;
      delete req.session.lsRefreshToken;
      delete req.session.lsDomainPrefix;
    }

    logger.info('Development logout successful');

    res.json({
      success: true,
      message: 'Development logout successful'
    });

  } catch (error) {
    logger.error('Development logout failed:', error);
    res.status(500).json({ 
      error: 'Development logout failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}; 