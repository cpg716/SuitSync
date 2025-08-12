import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import { PersistentUserSessionService } from '../services/persistentUserSessionService';
import logger from '../utils/logger';

const prisma = new PrismaClient().$extends(withAccelerate());

/**
 * User Selection Controller
 * 
 * Handles user selection for PC version where users need to select who they are
 * before making changes, ensuring proper audit trails.
 */
export class UserSelectionController {

  /**
   * Get all active user sessions for selection
   */
  static async getActiveUsers(req: Request, res: Response): Promise<void> {
    try {
      const activeSessions = await PersistentUserSessionService.getActiveSessions();
      
      // Get user details for each session
      const users = await Promise.all(
        activeSessions.map(async (session) => {
          const user = await prisma.user.findUnique({
            where: { id: session.userId }
          });
          
          return {
            id: session.userId,
            name: user?.name || 'Unknown User',
            email: user?.email || '',
            role: user?.role || '',
            photoUrl: user?.photoUrl || null,
            lastActiveAt: session.lastActive,
            deviceInfo: null // Not stored in simple schema
          };
        })
      );

      res.json({
        success: true,
        users,
        total: users.length
      });
    } catch (error) {
      logger.error('Failed to get active users:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve active users'
      });
    }
  }

  /**
   * Select a user for the current session
   */
  static async selectUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.body;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'userId is required'
        });
        return;
      }

      // Get the user session
      const userSession = await PersistentUserSessionService.getActiveSession(userId);

      if (!userSession) {
        res.status(404).json({
          success: false,
          error: 'User session not found or inactive'
        });
        return;
      }

      // Get user details from the User table
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      // Update session activity
      await PersistentUserSessionService.updateActivity(userId);

      // Set the selected user in the current session
      req.session.selectedUserId = String(userId);
      req.session.selectedUser = {
        id: String(user.id),
        name: user.name,
        email: user.email,
        role: user.role,
        photoUrl: user.photoUrl
      };

      // Log the user selection for audit
      /*
      await prisma.auditLog.create({
        data: {
          userId: null, // Will be set by audit middleware
          action: 'user_selected',
          entity: 'UserSession',
          entityId: parseInt(userSession.lightspeedUserId) || 0,
          details: JSON.stringify({
            selectedUser: userSession.name,
            selectedUserId: userSession.lightspeedUserId,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
          })
        }
      });
      */

      res.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          photoUrl: user.photoUrl
        },
        message: `Selected user: ${user.name}`
      });

    } catch (error) {
      logger.error('Failed to select user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to select user'
      });
    }
  }

  /**
   * Get currently selected user
   */
  static async getSelectedUser(req: Request, res: Response): Promise<void> {
    try {
      const selectedUserId = req.session.selectedUserId;
      
      if (!selectedUserId) {
        res.json({
          success: true,
          selectedUser: null
        });
        return;
      }

      const userSession = await PersistentUserSessionService.getActiveSession(parseInt(selectedUserId));

      if (!userSession) {
        // Clear invalid selection
        req.session.selectedUserId = undefined;
        req.session.selectedUser = undefined;

        res.json({
          success: true,
          selectedUser: null
        });
        return;
      }

      // Get user details from the User table
      const user = await prisma.user.findUnique({
        where: { id: userSession.userId }
      });

      if (!user) {
        // Clear invalid selection
        req.session.selectedUserId = undefined;
        req.session.selectedUser = undefined;

        res.json({
          success: true,
          selectedUser: null
        });
        return;
      }

      res.json({
        success: true,
        selectedUser: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          photoUrl: user.photoUrl
        }
      });

    } catch (error) {
      logger.error('Failed to get selected user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get selected user'
      });
    }
  }

  /**
   * Clear selected user
   */
  static async clearSelectedUser(req: Request, res: Response): Promise<void> {
    try {
      const previousUserId = req.session.selectedUserId;
      
      // Clear selection
      req.session.selectedUserId = undefined;
      req.session.selectedUser = undefined;

      // Log the user deselection for audit
      /*
      if (previousUserId) {
        await prisma.auditLog.create({
          data: {
            userId: null,
            action: 'user_deselected',
            entity: 'UserSession',
            entityId: parseInt(previousUserId) || 0,
            details: JSON.stringify({
              deselectedUserId: previousUserId,
              ipAddress: req.ip,
              userAgent: req.headers['user-agent']
            })
          }
        });
      }
      */

      res.json({
        success: true,
        message: 'User selection cleared'
      });

    } catch (error) {
      logger.error('Failed to clear selected user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to clear selected user'
      });
    }
  }

  /**
   * Deactivate a user session (logout)
   */
  static async deactivateUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'userId is required'
        });
        return;
      }

      const userIdNum = parseInt(userId);
      await PersistentUserSessionService.deactivateSession(userIdNum);

      // If this was the currently selected user, clear the selection
      if (req.session.selectedUserId === userIdNum.toString()) {
        req.session.selectedUserId = undefined;
        req.session.selectedUser = undefined;
      }

      // Log the deactivation for audit
      /*
      await prisma.auditLog.create({
        data: {
          userId: null,
          action: 'user_deactivated',
          entity: 'UserSession',
          entityId: parseInt(lightspeedUserId) || 0,
          details: JSON.stringify({
            deactivatedUserId: lightspeedUserId,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
          })
        }
      });
      */

      res.json({
        success: true,
        message: 'User session deactivated'
      });

    } catch (error) {
      logger.error('Failed to deactivate user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to deactivate user'
      });
    }
  }
}

export default UserSelectionController; 