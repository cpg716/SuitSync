import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import logger from '../utils/logger';

const prisma = new PrismaClient().$extends(withAccelerate());

export interface PersistentUserSession {
  id: string;
  userId: number;
  browserSessionId: string;
  lsAccessToken: string;
  lsRefreshToken: string;
  lsDomainPrefix: string;
  expiresAt: Date;
  lastActive: Date;
}

export interface UserSessionData {
  lightspeedUserId: string;
  lightspeedEmployeeId: string;
  email: string;
  name: string;
  role: string;
  photoUrl?: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  domainPrefix: string;
}

/**
 * Persistent User Session Service
 * 
 * This service manages user sessions that persist across devices and browser sessions,
 * following Lightspeed X-Series API rules for user authentication and audit trails.
 */
export class PersistentUserSessionService {
  
  /**
   * Create or update a persistent user session
   */
  static async createOrUpdateSession(
    userData: UserSessionData,
    deviceInfo?: { userAgent: string; ipAddress: string; deviceType: 'mobile' | 'desktop' | 'tablet' }
  ): Promise<PersistentUserSession> {
    try {
      // First, update or create the ApiToken
      await prisma.apiToken.upsert({
        where: { service: 'lightspeed' },
        update: {
          accessToken: userData.accessToken,
          refreshToken: userData.refreshToken,
          expiresAt: userData.expiresAt,
        },
        create: {
          service: 'lightspeed',
          accessToken: userData.accessToken,
          refreshToken: userData.refreshToken,
          expiresAt: userData.expiresAt,
        }
      });

      // First, ensure we have a local User record
      let user = await prisma.user.findFirst({
        where: {
          lightspeedEmployeeId: userData.lightspeedEmployeeId
        }
      });

      if (!user) {
        // Create a new user record
        user = await prisma.user.create({
          data: {
            email: userData.email,
            name: userData.name,
            role: userData.role,
            lightspeedEmployeeId: userData.lightspeedEmployeeId,
            photoUrl: userData.photoUrl,
            // No password hash for Lightspeed-only users
            passwordHash: null
          }
        });
        logger.info(`Created new user record for Lightspeed user: ${userData.name} (${userData.lightspeedEmployeeId})`);
      } else {
        // Update existing user record
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            email: userData.email,
            name: userData.name,
            role: userData.role,
            photoUrl: userData.photoUrl,
          }
        });
        logger.info(`Updated existing user record for: ${userData.name} (${userData.lightspeedEmployeeId})`);
      }

      // Check if there's an existing session for this user
      let session = await prisma.userSession.findFirst({
        where: {
          userId: user.id,
          expiresAt: {
            gt: new Date()
          }
        },
        orderBy: {
          lastActive: 'desc'
        }
      });

      if (session) {
        // Update existing session
        session = await prisma.userSession.update({
          where: { id: session.id },
          data: {
            lsAccessToken: userData.accessToken,
            lsRefreshToken: userData.refreshToken,
            lsDomainPrefix: userData.domainPrefix,
            expiresAt: userData.expiresAt,
            lastActive: new Date()
          }
        });
      } else {
        // Create new session
        const browserSessionId = `${userData.lightspeedUserId}_${Date.now()}`;
        session = await prisma.userSession.create({
          data: {
            userId: user.id,
            browserSessionId: browserSessionId,
            lsAccessToken: userData.accessToken,
            lsRefreshToken: userData.refreshToken,
            lsDomainPrefix: userData.domainPrefix,
            expiresAt: userData.expiresAt,
            lastActive: new Date()
          }
        });
      }

      logger.info(`Created/updated persistent session for user: ${userData.name} (${userData.lightspeedUserId})`);

      return {
        id: session.id,
        userId: session.userId,
        browserSessionId: session.browserSessionId,
        lsAccessToken: session.lsAccessToken,
        lsRefreshToken: session.lsRefreshToken,
        lsDomainPrefix: session.lsDomainPrefix,
        expiresAt: session.expiresAt,
        lastActive: session.lastActive
      };
    } catch (error) {
      logger.error('Failed to create/update persistent session:', error);
      throw error;
    }
  }

  /**
   * Get active user session by user ID
   */
  static async getActiveSession(userId: number): Promise<PersistentUserSession | null> {
    try {
      const session = await prisma.userSession.findFirst({
        where: {
          userId,
          expiresAt: {
            gt: new Date()
          }
        },
        orderBy: {
          lastActive: 'desc'
        }
      });

      if (!session) return null;

      return {
        id: session.id,
        userId: session.userId,
        browserSessionId: session.browserSessionId,
        lsAccessToken: session.lsAccessToken,
        lsRefreshToken: session.lsRefreshToken,
        lsDomainPrefix: session.lsDomainPrefix,
        expiresAt: session.expiresAt,
        lastActive: session.lastActive
      };
    } catch (error) {
      logger.error('Failed to get active session:', error);
      return null;
    }
  }

  /**
   * Get all active user sessions (for user selection)
   */
  static async getActiveSessions(): Promise<PersistentUserSession[]> {
    try {
      const sessions = await prisma.userSession.findMany({
        where: {
          expiresAt: {
            gt: new Date()
          }
        },
        orderBy: {
          lastActive: 'desc'
        }
      });

      return sessions.map(session => ({
        id: session.id,
        userId: session.userId,
        browserSessionId: session.browserSessionId,
        lsAccessToken: session.lsAccessToken,
        lsRefreshToken: session.lsRefreshToken,
        lsDomainPrefix: session.lsDomainPrefix,
        expiresAt: session.expiresAt,
        lastActive: session.lastActive
      }));
    } catch (error) {
      logger.error('Failed to get active sessions:', error);
      return [];
    }
  }

  /**
   * Update session activity timestamp
   */
  static async updateActivity(userId: number): Promise<void> {
    try {
      await prisma.userSession.updateMany({
        where: {
          userId,
          expiresAt: {
            gt: new Date()
          }
        },
        data: {
          lastActive: new Date()
        }
      });
    } catch (error) {
      logger.error('Failed to update session activity:', error);
    }
  }

  /**
   * Deactivate a user session
   */
  static async deactivateSession(userId: number): Promise<void> {
    try {
      await prisma.userSession.updateMany({
        where: {
          userId
        },
        data: {
          expiresAt: new Date() // Set to past to expire immediately
        }
      });
      logger.info(`Deactivated session for user: ${userId}`);
    } catch (error) {
      logger.error('Failed to deactivate session:', error);
    }
  }

  /**
   * Clean up expired sessions (older than 30 days)
   */
  static async cleanupExpiredSessions(): Promise<void> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      await prisma.userSession.deleteMany({
        where: {
          lastActive: {
            lt: thirtyDaysAgo
          }
        }
      });

      logger.info('Cleaned up expired user sessions');
    } catch (error) {
      logger.error('Failed to cleanup expired sessions:', error);
    }
  }
}

export default PersistentUserSessionService; 