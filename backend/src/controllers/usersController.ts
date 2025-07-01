import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import bcrypt from 'bcryptjs';
import { createLightspeedClient } from '../lightspeedClient';
import { UserSyncService } from '../services/userSyncService';
import { PinService } from '../services/pinService';
import logger from '../utils/logger';

const prisma = new PrismaClient().$extends(withAccelerate());

// Type for user with included relations
type UserWithRelations = Prisma.UserGetPayload<{
  include: {
    tailorAbilities: {
      include: {
        taskType: true
      }
    },
    tailorSchedules: true,
    skills: true
  }
}>;

export const getUsers = async (req: Request, res: Response) => {
  try {
    logger.info('[UsersController] Starting getUsers request - hybrid system (Lightspeed + local users)');

    // Check if user is authenticated with Lightspeed (lightspeedUser is sufficient - tokens will be refreshed automatically if needed)
    if (!req.session?.lightspeedUser) {
      logger.warn('[UsersController] No Lightspeed user in session - authentication required');
      res.status(401).json({
        error: 'Lightspeed authentication required',
        redirectTo: '/auth/start-lightspeed'
      });
      return;
    }

    try {
      // Fetch both Lightspeed users and local users
      // The Lightspeed client will automatically refresh tokens if needed
      const client = createLightspeedClient(req);
      logger.info('[UsersController] Fetching users from both Lightspeed API and local database...');

      // Fetch all users from Lightspeed using pagination
      const lightspeedUsers = await client.fetchAllWithPagination('/users');
      logger.info(`[UsersController] Found ${lightspeedUsers.length} users from Lightspeed`);

      // Fetch all local users
      const localUsers = await prisma.user.findMany({
        include: {
          tailorAbilities: {
            include: {
              taskType: true
            }
          },
          tailorSchedules: true,
          skills: true
        },
        orderBy: { name: 'asc' }
      });
      logger.info(`[UsersController] Found ${localUsers.length} local users`);

      // Create a map of Lightspeed users for easy lookup
      const lightspeedUserMap = new Map(lightspeedUsers.map(user => [user.id.toString(), user]));

      // Format local users with Lightspeed data merged in
      const formattedLocalUsers = localUsers.map((localUser) => {
        const lightspeedData = lightspeedUserMap.get(localUser.lightspeedEmployeeId || '');

        return {
          id: localUser.id,
          name: lightspeedData?.display_name || localUser.name,
          email: lightspeedData?.email || localUser.email,
          role: lightspeedData?.account_type === 'admin' ? 'admin' : localUser.role,
          photoUrl: lightspeedData?.image_source || localUser.photoUrl,
          lightspeedEmployeeId: localUser.lightspeedEmployeeId,
          commissionRate: localUser.commissionRate,
          source: 'hybrid',
          isLightspeedUser: !!lightspeedData,
          hasLocalRecord: true,
          isCurrentUser: localUser.lightspeedEmployeeId === req.session.lightspeedUser?.lightspeedId,
          tailorAbilities: (localUser as any).tailorAbilities || [],
          tailorSchedules: (localUser as any).tailorSchedules || [],
          skills: (localUser as any).skills || [],
          createdAt: localUser.createdAt,
          updatedAt: localUser.updatedAt
        };
      });

      // Format Lightspeed-only users (those without local records)
      const lightspeedOnlyUsers = lightspeedUsers
        .filter(lsUser => !localUsers.some(localUser => localUser.lightspeedEmployeeId === lsUser.id.toString()))
        .map((user: any) => ({
          id: user.id,
          name: user.display_name || user.name || `User ${user.id}`,
          email: user.email || `${user.username || user.id}@lightspeed.local`,
          role: user.account_type === 'admin' ? 'admin' : 'user',
          photoUrl: user.image_source || user.avatar || undefined,
          lightspeedEmployeeId: user.id,
          source: 'lightspeed',
          isLightspeedUser: true,
          hasLocalRecord: false,
          isCurrentUser: user.id === req.session.lightspeedUser?.lightspeedId
        }));

      // Combine all users
      const allUsers = [...formattedLocalUsers, ...lightspeedOnlyUsers];

      // Return in the format expected by frontend components
      res.json({
        lightspeedUsers: lightspeedOnlyUsers,
        localUsers: formattedLocalUsers,
        users: allUsers, // Combined list for backward compatibility
        total: allUsers.length,
        source: 'hybrid',
        message: `Found ${allUsers.length} total users (${formattedLocalUsers.length} with local records, ${lightspeedOnlyUsers.length} Lightspeed-only)`
      });

    } catch (lightspeedError: any) {
      logger.error('[UsersController] Failed to fetch users from Lightspeed:', lightspeedError);

      // If Lightspeed API fails, fall back to local users only
      try {
        const localUsers = await prisma.user.findMany({
          include: {
            tailorAbilities: {
              include: {
                taskType: true
              }
            },
            tailorSchedules: true,
            skills: true
          },
          orderBy: { name: 'asc' }
        });

        const formattedLocalUsers = localUsers.map((localUser) => ({
          id: localUser.id,
          name: localUser.name,
          email: localUser.email,
          role: localUser.role,
          photoUrl: localUser.photoUrl,
          lightspeedEmployeeId: localUser.lightspeedEmployeeId,
          commissionRate: localUser.commissionRate,
          source: 'local',
          isLightspeedUser: false,
          hasLocalRecord: true,
          isCurrentUser: localUser.lightspeedEmployeeId === req.session.lightspeedUser?.lightspeedId,
          tailorAbilities: (localUser as any).tailorAbilities || [],
          tailorSchedules: (localUser as any).tailorSchedules || [],
          skills: (localUser as any).skills || [],
          createdAt: localUser.createdAt,
          updatedAt: localUser.updatedAt
        }));

        logger.info('[UsersController] Falling back to local users only due to Lightspeed API error');
        res.json({
          lightspeedUsers: [],
          localUsers: formattedLocalUsers,
          users: formattedLocalUsers,
          total: formattedLocalUsers.length,
          source: 'local',
          message: 'Lightspeed API error - showing local users only',
          error: lightspeedError.message
        });
      } catch (dbError: any) {
        logger.error('[UsersController] Failed to fetch local users as fallback:', dbError);

        // Final fallback: return just the current user from session
        const lightspeedUser = req.session.lightspeedUser;
        const fallbackUser = {
          id: lightspeedUser.id,
          name: lightspeedUser.name,
          email: lightspeedUser.email,
          role: lightspeedUser.role,
          photoUrl: lightspeedUser.photoUrl,
          lightspeedEmployeeId: lightspeedUser.lightspeedEmployeeId,
          source: 'session',
          isLightspeedUser: true,
          hasLocalRecord: false,
          isCurrentUser: true
        };

        res.json({
          lightspeedUsers: [fallbackUser],
          localUsers: [],
          users: [fallbackUser],
          total: 1,
          source: 'session',
          message: 'Both Lightspeed API and database failed - showing current user only',
          error: `Lightspeed: ${lightspeedError.message}, Database: ${dbError.message}`
        });
      }
    }

  } catch (err) {
    logger.error('[UsersController] Failed to fetch users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const getUser = async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: Number(req.params.id) },
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
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { name, email, role, photoUrl } = req.body;
    const user = await prisma.user.update({
      where: { id: Number(req.params.id) },
      data: { name, email, role, photoUrl },
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
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    await prisma.user.delete({ where: { id: Number(req.params.id) } });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch current user' });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, photoUrl } = req.body;
    if (!name || !email || !role) {
      res.status(400).json({ error: 'Name, email, and role are required.' });
      return;
    }
    let passwordHash = undefined;
    if (password) {
      passwordHash = await bcrypt.hash(password, 10);
    }
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
        photoUrl,
      },
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
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user' });
  }
};

export const updateUserPhoto = async (req: Request, res: Response) => {
  // Implementation of updateUserPhoto method
};

export const getUserActivity = async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's audit log entries (activity)
    const activity = await prisma.auditLog.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' },
      take: 50, // Limit to last 50 activities
      select: {
        id: true,
        action: true,
        entity: true,
        createdAt: true,
        details: true
      }
    });

    res.json(activity);
  } catch (err) {
    console.error('Error fetching user activity:', err);
    res.status(500).json({ error: 'Failed to fetch user activity' });
  }
};

export const syncUsers = async (req: Request, res: Response) => {
  try {
    logger.info('[UsersController] Starting manual user sync from Lightspeed');

    const result = await UserSyncService.syncAllUsers(req);

    res.json({
      success: true,
      message: 'User sync completed',
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('[UsersController] Error during user sync:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync users',
      details: error.message
    });
  }
};

export const getUserPinInfo = async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Check if current user is admin
    const currentUser = (req as any).user;
    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const pinInfo = await PinService.getPinInfo(userId);

    res.json({
      success: true,
      pinInfo
    });
  } catch (error: any) {
    logger.error('[UsersController] Error getting user PIN info:', error);
    res.status(500).json({ error: 'Failed to get PIN info' });
  }
};

export const adminSetUserPin = async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    const { pin } = req.body;

    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Check if current user is admin
    const currentUser = (req as any).user;
    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (!pin || typeof pin !== 'string') {
      return res.status(400).json({ error: 'PIN is required' });
    }

    const result = await PinService.setPin(userId, pin);

    if (result.success) {
      logger.info(`[UsersController] Admin ${currentUser.id} set PIN for user ${userId}`);
      res.json({
        success: true,
        message: 'PIN set successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error: any) {
    logger.error('[UsersController] Error setting user PIN:', error);
    res.status(500).json({ error: 'Failed to set PIN' });
  }
};

export const adminRemoveUserPin = async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);

    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Check if current user is admin
    const currentUser = (req as any).user;
    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await PinService.removePin(userId);

    if (result.success) {
      logger.info(`[UsersController] Admin ${currentUser.id} removed PIN for user ${userId}`);
      res.json({
        success: true,
        message: 'PIN removed successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error: any) {
    logger.error('[UsersController] Error removing user PIN:', error);
    res.status(500).json({ error: 'Failed to remove PIN' });
  }
};