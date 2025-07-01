import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import { createLightspeedClient } from '../lightspeedClient';
import logger from '../utils/logger';

const prisma = new PrismaClient().$extends(withAccelerate());

/**
 * Map Lightspeed account types to SuitSync roles
 */
function mapLightspeedRoleToSuitSync(lightspeedAccountType: string): string {
  switch (lightspeedAccountType?.toLowerCase()) {
    case 'admin':
      return 'admin';
    case 'manager':
      return 'sales_management';
    case 'employee':
    case 'sales':
      return 'sales';
    case 'tailor':
      return 'tailor';
    default:
      return 'sales';
  }
}

export interface UserSyncResult {
  created: number;
  updated: number;
  errors: number;
  details: string[];
}

export class UserSyncService {
  /**
   * Sync all Lightspeed users to local database
   */
  static async syncAllUsers(req: any): Promise<UserSyncResult> {
    const result: UserSyncResult = {
      created: 0,
      updated: 0,
      errors: 0,
      details: []
    };

    try {
      logger.info('[UserSyncService] Starting full user sync from Lightspeed');
      
      // Fetch all users from Lightspeed
      const client = createLightspeedClient(req);
      const lightspeedUsers = await client.fetchAllWithPagination('/users');
      
      logger.info(`[UserSyncService] Found ${lightspeedUsers.length} users in Lightspeed`);

      for (const lsUser of lightspeedUsers) {
        try {
          const syncResult = await this.syncSingleUser(lsUser);
          if (syncResult.created) {
            result.created++;
            result.details.push(`Created user: ${lsUser.display_name} (${lsUser.email})`);
          } else if (syncResult.updated) {
            result.updated++;
            result.details.push(`Updated user: ${lsUser.display_name} (${lsUser.email})`);
          }
        } catch (error: any) {
          result.errors++;
          result.details.push(`Error syncing user ${lsUser.display_name}: ${error.message}`);
          logger.error(`[UserSyncService] Error syncing user ${lsUser.id}:`, error);
        }
      }

      logger.info(`[UserSyncService] Sync completed: ${result.created} created, ${result.updated} updated, ${result.errors} errors`);
      return result;

    } catch (error: any) {
      logger.error('[UserSyncService] Failed to sync users:', error);
      result.errors++;
      result.details.push(`Failed to fetch users from Lightspeed: ${error.message}`);
      return result;
    }
  }

  /**
   * Sync a single Lightspeed user to local database
   */
  static async syncSingleUser(lightspeedUser: any): Promise<{ created: boolean; updated: boolean; user: any }> {
    const lightspeedId = lightspeedUser.id.toString();
    const name = lightspeedUser.display_name || `User ${lightspeedUser.id}`;
    const email = lightspeedUser.email || `${lightspeedUser.username || lightspeedUser.id}@lightspeed.local`;
    const role = mapLightspeedRoleToSuitSync(lightspeedUser.account_type);
    const photoUrl = lightspeedUser.image_source || undefined;

    // Skip invalid users (system accounts, test accounts, etc.)
    if (name === 'SuitSync' || name.toLowerCase().includes('test') || name.toLowerCase().includes('demo')) {
      logger.warn(`[UserSyncService] Skipping invalid/system user: ${name} (${email})`);
      return { created: false, updated: false, user: null };
    }

    try {
      // Try to find existing user by Lightspeed ID or email
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { lightspeedEmployeeId: lightspeedId },
            { email: email }
          ]
        }
      });

      if (existingUser) {
        // Update existing user with latest Lightspeed data
        const updatedUser = await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            name,
            email,
            role,
            photoUrl,
            lightspeedEmployeeId: lightspeedId,
          }
        });

        logger.debug(`[UserSyncService] Updated user ${updatedUser.id} with Lightspeed data`);
        return { created: false, updated: true, user: updatedUser };
      } else {
        // Create new user from Lightspeed data
        const newUser = await prisma.user.create({
          data: {
            name,
            email,
            role,
            photoUrl,
            lightspeedEmployeeId: lightspeedId,
            commissionRate: 0.1, // Default commission rate
          }
        });

        logger.debug(`[UserSyncService] Created new user ${newUser.id} from Lightspeed data`);
        return { created: true, updated: false, user: newUser };
      }
    } catch (error: any) {
      logger.error(`[UserSyncService] Error syncing user ${lightspeedId}:`, error);
      throw error;
    }
  }

  /**
   * Update local user with SuitSync-specific data while preserving Lightspeed sync
   */
  static async updateLocalUserData(userId: number, data: {
    commissionRate?: number;
    notificationPrefs?: any;
    // Don't allow updating name, email, role, photoUrl - these come from Lightspeed
  }): Promise<any> {
    try {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          commissionRate: data.commissionRate,
          notificationPrefs: data.notificationPrefs,
          updatedAt: new Date()
        },
        include: {
          tailorAbilities: {
            include: {
              taskType: true
            }
          },
          tailorSchedules: true,
          skills: true
        }
      });

      logger.info(`[UserSyncService] Updated local data for user ${userId}`);
      return updatedUser;
    } catch (error: any) {
      logger.error(`[UserSyncService] Error updating local user data for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Handle user deletion in Lightspeed (mark as inactive rather than delete)
   */
  static async handleLightspeedUserDeletion(lightspeedEmployeeId: string): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { lightspeedEmployeeId }
      });

      if (user) {
        // Mark user as inactive rather than deleting to preserve historical data
        await prisma.user.update({
          where: { id: user.id },
          data: {
            role: 'inactive',
            updatedAt: new Date()
          }
        });

        logger.info(`[UserSyncService] Marked user ${user.id} as inactive (deleted from Lightspeed)`);
      }
    } catch (error: any) {
      logger.error(`[UserSyncService] Error handling user deletion for ${lightspeedEmployeeId}:`, error);
      throw error;
    }
  }

  /**
   * Get sync status and recommendations
   */
  static async getSyncStatus(): Promise<{
    localUsers: number;
    lightspeedUsers: number;
    needsSync: boolean;
    lastSync?: Date;
  }> {
    try {
      const localUserCount = await prisma.user.count({
        where: {
          lightspeedEmployeeId: {
            not: null
          }
        }
      });

      // This would need a Lightspeed API call to get accurate count
      // For now, return basic info
      return {
        localUsers: localUserCount,
        lightspeedUsers: 0, // Would need API call
        needsSync: false, // Would need comparison logic
        lastSync: undefined // Would need to track this
      };
    } catch (error: any) {
      logger.error('[UserSyncService] Error getting sync status:', error);
      throw error;
    }
  }
}
