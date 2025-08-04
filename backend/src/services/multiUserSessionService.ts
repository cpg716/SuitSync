import { Request } from 'express';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

const prisma = new PrismaClient();

interface UserSessionData {
  lsAccessToken: string;
  lsRefreshToken: string;
  lsDomainPrefix: string;
  expiresAt: Date;
  lastActiveAt: Date;
  loginTime: Date;
}

interface CachedUserInfo {
  id: number;
  name: string;
  email: string;
  role: string;
  photoUrl?: string | null;
  lastActive: Date;
  loginTime: Date;
}

export class MultiUserSessionService {
  private static readonly MAX_CACHED_USERS = 2; // Further reduced to prevent memory issues
  private static readonly SESSION_CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly MAX_SESSION_SIZE = 1.5 * 1024; // 1.5KB limit for session data

  /**
   * Add or update a user session in the multi-user cache
   */
  static async addUserSession(
    req: Request,
    userId: number,
    sessionData: Omit<UserSessionData, 'lastActive' | 'loginTime'>
  ): Promise<void> {
    try {
      const sessionId = req.sessionID;
      const now = new Date();

      // Initialize session structure if needed
      if (!req.session.userSessions) {
        req.session.userSessions = {};
      }
      if (!req.session.maxCachedUsers) {
        req.session.maxCachedUsers = this.MAX_CACHED_USERS;
      }

      // Add to in-memory session cache
      req.session.userSessions[userId] = {
        ...sessionData,
                  lastActiveAt: now,
        loginTime: now,
      };

      // Set as active user
      req.session.activeUserId = userId;

      // Also update legacy session properties for backward compatibility
      req.session.userId = userId;
      req.session.lsAccessToken = sessionData.lsAccessToken;
      req.session.lsRefreshToken = sessionData.lsRefreshToken;
      req.session.lsDomainPrefix = sessionData.lsDomainPrefix;

      // Persist to database for cross-session persistence
      await prisma.userSession.upsert({
        where: {
          userId_browserSessionId: {
            userId,
            browserSessionId: sessionId,
          },
        },
        update: {
          lsAccessToken: sessionData.lsAccessToken,
          lsRefreshToken: sessionData.lsRefreshToken,
          lsDomainPrefix: sessionData.lsDomainPrefix,
          expiresAt: sessionData.expiresAt,
          lastActiveAt: now,
        },
        create: {
          userId: userId,
          browserSessionId: req.sessionID,
          lastActiveAt: now,
          lsAccessToken: sessionData.lsAccessToken,
          lsRefreshToken: sessionData.lsRefreshToken,
          lsDomainPrefix: sessionData.lsDomainPrefix,
          expiresAt: sessionData.expiresAt,
          // Add required fields for new schema
          lightspeedUserId: userId.toString(),
          lightspeedEmployeeId: userId.toString(),
          email: 'legacy@example.com',
          name: 'Legacy User',
          role: 'sales'
        }
      });

      // Clean up old sessions if we exceed the limit
      await this.cleanupOldSessions(req);

      // Check session size and clean up if necessary
      await this.checkSessionSize(req);

      // Save the session to ensure it's persisted
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      logger.info(`Added user session for user ${userId} to multi-user cache`);

      // Look up the user from the database
      const userRecord = await prisma.user.findUnique({ where: { id: userId } });
      req.session.lightspeedUser = {
        id: userId,
        name: userRecord?.name || '',
        email: userRecord?.email || '',
        role: userRecord?.role || '',
        photoUrl: userRecord?.photoUrl || null,
        lightspeedEmployeeId: userRecord?.lightspeedEmployeeId || null,
        isLightspeedUser: true,
        hasLocalRecord: !!userRecord,
        localUserId: userId
      };
      req.session.userId = userId;
      req.session.activeUserId = userId;
      req.session.lsAccessToken = sessionData.lsAccessToken;
      req.session.lsRefreshToken = sessionData.lsRefreshToken;
      req.session.lsDomainPrefix = sessionData.lsDomainPrefix;
      if (!req.session.userSessions) req.session.userSessions = {};
      req.session.userSessions[userId] = {
        lsAccessToken: sessionData.lsAccessToken,
        lsRefreshToken: sessionData.lsRefreshToken,
        lsDomainPrefix: sessionData.lsDomainPrefix,
        expiresAt: sessionData.expiresAt,
        lastActive: new Date(),
        loginTime: new Date()
      };
      logger.info('[MultiUserSession] Session fields synchronized for user', { userId });
      await new Promise<void>((resolve, reject) => req.session.save(err => err ? reject(err) : resolve()));
      logger.info('[MultiUserSession] Session saved for user', { userId });
    } catch (error) {
      logger.error('Error adding user session:', error);
      throw error;
    }
  }

  /**
   * Switch to a different cached user
   */
  static async switchToUser(req: Request, targetUserId: number): Promise<boolean> {
    try {
      // Check if user is in session cache
      const userSession = req.session.userSessions?.[targetUserId];
      
      if (userSession) {
        // Update active user
        req.session.activeUserId = targetUserId;
        
        // Update legacy session properties for backward compatibility
        req.session.userId = targetUserId;
        req.session.lsAccessToken = userSession.lsAccessToken;
        req.session.lsRefreshToken = userSession.lsRefreshToken;
        req.session.lsDomainPrefix = userSession.lsDomainPrefix;

        // Update last active time
        userSession.lastActiveAt = new Date();
        
        // Update database
        await prisma.userSession.updateMany({
          where: {
            userId: targetUserId,
            browserSessionId: req.sessionID,
          },
          data: {
            lastActiveAt: new Date(),
          },
        });

        // Save the session to ensure it's persisted
        await new Promise<void>((resolve, reject) => {
          req.session.save((err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        logger.info(`Switched to user ${targetUserId} from cache`);
        return true;
      }

      // Try to load from database if not in session cache
      const dbSession = await prisma.userSession.findFirst({
        where: {
          userId: targetUserId,
          browserSessionId: req.sessionID,
          expiresAt: {
            gt: new Date(),
          },
        },
      });

      if (dbSession) {
        // Restore to session cache
        if (!req.session.userSessions) {
          req.session.userSessions = {};
        }

        req.session.userSessions[targetUserId] = {
          lsAccessToken: dbSession.lsAccessToken,
          lsRefreshToken: dbSession.lsRefreshToken,
          lsDomainPrefix: dbSession.lsDomainPrefix,
          expiresAt: dbSession.expiresAt,
          lastActiveAt: new Date(),
          loginTime: dbSession.createdAt,
        };

        // Switch to this user
        return await this.switchToUser(req, targetUserId);
      }

      logger.warn(`User ${targetUserId} not found in session cache or database`);
      return false;
    } catch (error) {
      logger.error('Error switching user:', error);
      return false;
    }
  }

  /**
   * Get list of cached users for the current session
   */
  static async getCachedUsers(req: Request): Promise<CachedUserInfo[]> {
    try {
      const sessionId = req.sessionID;
      const cachedUsers: CachedUserInfo[] = [];

      // Get from session cache first
      if (req.session.userSessions) {
        const userIds = Object.keys(req.session.userSessions).map(id => parseInt(id));
        
        if (userIds.length > 0) {
          const users = await prisma.user.findMany({
            where: {
              id: {
                in: userIds,
              },
            },
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              photoUrl: true,
            },
          });

          for (const user of users) {
            const sessionData = req.session.userSessions[user.id];
            if (sessionData) {
              cachedUsers.push({
                ...user,
                lastActive: sessionData.lastActiveAt,
                loginTime: sessionData.loginTime,
              });
            }
          }
        }
      }

      // Also check database for any sessions not in memory
      const dbSessions = await prisma.userSession.findMany({
        where: {
          browserSessionId: sessionId,
          expiresAt: {
            gt: new Date(),
          },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              photoUrl: true,
            },
          },
        },
      });

      // Add any database sessions not already in the list
      for (const dbSession of dbSessions) {
        if (dbSession.user && !cachedUsers.find(u => u.id === dbSession.userId)) {
          cachedUsers.push({
            id: dbSession.user.id,
            name: dbSession.user.name,
            email: dbSession.user.email,
            role: dbSession.user.role,
            photoUrl: dbSession.user.photoUrl,
            lastActive: dbSession.lastActiveAt,
            loginTime: dbSession.createdAt,
          });
        }
      }

      // Sort by last active (most recent first)
      return cachedUsers.sort((a, b) => b.lastActive.getTime() - a.lastActive.getTime());
    } catch (error) {
      logger.error('Error getting cached users:', error);
      return [];
    }
  }

  /**
   * Remove a user from the session cache
   */
  static async removeUserSession(req: Request, userId: number): Promise<void> {
    try {
      // Remove from session cache
      if (req.session.userSessions) {
        delete req.session.userSessions[userId];
      }

      // Remove from database
      await prisma.userSession.deleteMany({
        where: {
          userId,
          browserSessionId: req.sessionID,
        },
      });

      // If this was the active user, clear active session
      if (req.session.activeUserId === userId) {
        req.session.activeUserId = undefined;
        req.session.userId = undefined;
        req.session.lsAccessToken = undefined;
        req.session.lsRefreshToken = undefined;
        req.session.lsDomainPrefix = undefined;
      }

      logger.info(`Removed user ${userId} from session cache`);
    } catch (error) {
      logger.error('Error removing user session:', error);
      throw error;
    }
  }

  /**
   * Clean up old sessions to maintain the cache limit
   */
  private static async cleanupOldSessions(req: Request): Promise<void> {
    try {
      if (!req.session.userSessions) return;

      const maxUsers = req.session.maxCachedUsers || this.MAX_CACHED_USERS;
      const userSessions = Object.entries(req.session.userSessions);

      if (userSessions.length > maxUsers) {
        // Sort by last active time (oldest first)
        const typedSessions = userSessions as [string, UserSessionData][];
        typedSessions.sort(([, a], [, b]) => a.lastActiveAt.getTime() - b.lastActiveAt.getTime());

        // Remove oldest sessions
        const sessionsToRemove = userSessions.slice(0, userSessions.length - maxUsers);
        
        for (const [userIdStr] of sessionsToRemove) {
          const userId = parseInt(userIdStr);
          await this.removeUserSession(req, userId);
        }
      }
    } catch (error) {
      logger.error('Error cleaning up old sessions:', error);
    }
  }

  /**
   * Clean up expired sessions from database
   */
  static async cleanupExpiredSessions(): Promise<void> {
    try {
      const result = await prisma.userSession.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      if (result.count > 0) {
        logger.info(`Cleaned up ${result.count} expired user sessions`);
      }
    } catch (error) {
      logger.error('Error cleaning up expired sessions:', error);
    }
  }

  /**
   * Get current active user session data
   */
  static getCurrentUserSession(req: Request): UserSessionData | null {
    const activeUserId = req.session.activeUserId || req.session.userId;
    if (!activeUserId || !req.session.userSessions) {
      return null;
    }

    // Only work with number user IDs for legacy database users
    if (typeof activeUserId === 'number') {
      return req.session.userSessions[activeUserId] || null;
    }
    return null;
  }

  /**
   * Update tokens for a specific user session
   */
  static async updateUserTokens(
    req: Request,
    userId: number,
    accessToken: string,
    refreshToken: string,
    expiresAt: Date
  ): Promise<void> {
    try {
      // Update session cache
      if (req.session.userSessions?.[userId]) {
        req.session.userSessions[userId].lsAccessToken = accessToken;
        req.session.userSessions[userId].lsRefreshToken = refreshToken;
        req.session.userSessions[userId].expiresAt = expiresAt;
        req.session.userSessions[userId].lastActiveAt = new Date();
      }

      // Update legacy session if this is the active user
      if (req.session.activeUserId === userId || req.session.userId === userId) {
        req.session.lsAccessToken = accessToken;
        req.session.lsRefreshToken = refreshToken;
      }

      // Update database
      await prisma.userSession.updateMany({
        where: {
          userId,
          browserSessionId: req.sessionID,
        },
        data: {
          lsAccessToken: accessToken,
          lsRefreshToken: refreshToken,
          expiresAt,
          lastActiveAt: new Date(),
        },
      });

      logger.info(`Updated tokens for user ${userId}`);
    } catch (error) {
      logger.error('Error updating user tokens:', error);
      throw error;
    }
  }

  /**
   * Check session size and clean up if it's too large to prevent 431 errors
   */
  private static async checkSessionSize(req: Request): Promise<void> {
    try {
      if (!req.session.userSessions) return;

      const sessionData = JSON.stringify(req.session);
      const sessionSize = Buffer.byteLength(sessionData, 'utf8');

      if (sessionSize > this.MAX_SESSION_SIZE) {
        logger.warn(`Session size (${sessionSize} bytes) exceeds limit (${this.MAX_SESSION_SIZE} bytes). Cleaning up.`);

        const userSessions = Object.entries(req.session.userSessions);
        if (userSessions.length > 1) {
          // Keep only the most recently active session
          const typedSessions = userSessions as [string, UserSessionData][];
          typedSessions.sort(([, a], [, b]) => b.lastActiveAt.getTime() - a.lastActiveAt.getTime());
          const sessionToKeep = userSessions[0];

          // Remove all other sessions
          for (const [userIdStr] of userSessions.slice(1)) {
            const userId = parseInt(userIdStr);
            await this.removeUserSession(req, userId);
          }

          logger.info(`Reduced session size by keeping only the most active user session (user ${sessionToKeep[0]})`);
        }
      }
    } catch (error) {
      logger.error('Error checking session size:', error);
    }
  }
}

// Set up periodic cleanup of expired sessions
setInterval(() => {
  MultiUserSessionService.cleanupExpiredSessions();
}, MultiUserSessionService['SESSION_CLEANUP_INTERVAL']);

// Also clean up on startup
MultiUserSessionService.cleanupExpiredSessions();
