import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import logger from '../utils/logger';

const prisma = new PrismaClient().$extends(withAccelerate());

export interface PersistentUserSession {
  id: string;
  lightspeedUserId: string;
  lightspeedEmployeeId: string;
  email: string;
  name: string;
  role: string;
  photoUrl?: string;
  lastActiveAt: Date;
  isActive: boolean;
  deviceInfo?: {
    userAgent: string;
    ipAddress: string;
    deviceType: 'mobile' | 'desktop' | 'tablet';
  };
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

      // Then, create or update the UserSession
      const session = await prisma.userSession.upsert({
        where: {
          lightspeedUserId: userData.lightspeedUserId
        },
        update: {
          lightspeedEmployeeId: userData.lightspeedEmployeeId,
          email: userData.email,
          name: userData.name,
          role: userData.role,
          photoUrl: userData.photoUrl,
          lastActiveAt: new Date(),
          isActive: true,
          deviceInfo: deviceInfo ? JSON.stringify(deviceInfo) : undefined,
        },
        create: {
          lightspeedUserId: userData.lightspeedUserId,
          lightspeedEmployeeId: userData.lightspeedEmployeeId,
          email: userData.email,
          name: userData.name,
          role: userData.role,
          photoUrl: userData.photoUrl,
          lastActiveAt: new Date(),
          isActive: true,
          deviceInfo: deviceInfo ? JSON.stringify(deviceInfo) : undefined,
        }
      });

      logger.info(`Created/updated persistent session for user: ${userData.name} (${userData.lightspeedUserId})`);
      
      return {
        id: session.id,
        lightspeedUserId: session.lightspeedUserId,
        lightspeedEmployeeId: session.lightspeedEmployeeId,
        email: session.email,
        name: session.name,
        role: session.role,
        photoUrl: session.photoUrl || undefined,
        lastActiveAt: session.lastActiveAt,
        isActive: session.isActive,
        deviceInfo: session.deviceInfo ? JSON.parse(session.deviceInfo) : undefined
      };
    } catch (error) {
      logger.error('Failed to create/update persistent session:', error);
      throw error;
    }
  }

  /**
   * Get active user session by Lightspeed user ID
   */
  static async getActiveSession(lightspeedUserId: string): Promise<PersistentUserSession | null> {
    try {
      const session = await prisma.userSession.findFirst({
        where: {
          lightspeedUserId,
          isActive: true
        }
      });

      if (!session) return null;

      return {
        id: session.id,
        lightspeedUserId: session.lightspeedUserId,
        lightspeedEmployeeId: session.lightspeedEmployeeId,
        email: session.email,
        name: session.name,
        role: session.role,
        photoUrl: session.photoUrl || undefined,
        lastActiveAt: session.lastActiveAt,
        isActive: session.isActive,
        deviceInfo: session.deviceInfo ? JSON.parse(session.deviceInfo) : undefined
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
          isActive: true
        },
        orderBy: {
          lastActiveAt: 'desc'
        }
      });

      return sessions.map(session => ({
        id: session.id,
        lightspeedUserId: session.lightspeedUserId,
        lightspeedEmployeeId: session.lightspeedEmployeeId,
        email: session.email,
        name: session.name,
        role: session.role,
        photoUrl: session.photoUrl || undefined,
        lastActiveAt: session.lastActiveAt,
        isActive: session.isActive,
        deviceInfo: session.deviceInfo ? JSON.parse(session.deviceInfo) : undefined
      }));
    } catch (error) {
      logger.error('Failed to get active sessions:', error);
      return [];
    }
  }

  /**
   * Update session activity timestamp
   */
  static async updateActivity(lightspeedUserId: string): Promise<void> {
    try {
      await prisma.userSession.updateMany({
        where: {
          lightspeedUserId,
          isActive: true
        },
        data: {
          lastActiveAt: new Date()
        }
      });
    } catch (error) {
      logger.error('Failed to update session activity:', error);
    }
  }

  /**
   * Deactivate a user session
   */
  static async deactivateSession(lightspeedUserId: string): Promise<void> {
    try {
      await prisma.userSession.updateMany({
        where: {
          lightspeedUserId
        },
        data: {
          isActive: false
        }
      });
      logger.info(`Deactivated session for user: ${lightspeedUserId}`);
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

      await prisma.userSession.updateMany({
        where: {
          lastActiveAt: {
            lt: thirtyDaysAgo
          },
          isActive: true
        },
        data: {
          isActive: false
        }
      });

      logger.info('Cleaned up expired user sessions');
    } catch (error) {
      logger.error('Failed to cleanup expired sessions:', error);
    }
  }
}

export default PersistentUserSessionService; 