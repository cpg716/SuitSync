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
      
      // Format for frontend display
      const users = activeSessions.map(session => ({
        id: session.lightspeedUserId,
        name: session.name,
        email: session.email,
        role: session.role,
        photoUrl: session.photoUrl,
        lastActiveAt: session.lastActiveAt,
        deviceInfo: session.deviceInfo
      }));

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
      const { lightspeedUserId } = req.body;

      if (!lightspeedUserId) {
        res.status(400).json({
          success: false,
          error: 'lightspeedUserId is required'
        });
        return;
      }

      // Get the user session
      const userSession = await PersistentUserSessionService.getActiveSession(lightspeedUserId);
      
      if (!userSession) {
        res.status(404).json({
          success: false,
          error: 'User session not found or inactive'
        });
        return;
      }

      // Update session activity
      await PersistentUserSessionService.updateActivity(lightspeedUserId);

      // Set the selected user in the current session
      req.session.selectedUserId = lightspeedUserId;
      req.session.selectedUser = {
        id: userSession.lightspeedUserId,
        name: userSession.name,
        email: userSession.email,
        role: userSession.role,
        photoUrl: userSession.photoUrl
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
          id: userSession.lightspeedUserId,
          name: userSession.name,
          email: userSession.email,
          role: userSession.role,
          photoUrl: userSession.photoUrl
        },
        message: `Selected user: ${userSession.name}`
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

      const userSession = await PersistentUserSessionService.getActiveSession(selectedUserId);
      
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

      res.json({
        success: true,
        selectedUser: {
          id: userSession.lightspeedUserId,
          name: userSession.name,
          email: userSession.email,
          role: userSession.role,
          photoUrl: userSession.photoUrl
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
      const { lightspeedUserId } = req.params;

      if (!lightspeedUserId) {
        res.status(400).json({
          success: false,
          error: 'lightspeedUserId is required'
        });
        return;
      }

      await PersistentUserSessionService.deactivateSession(lightspeedUserId);

      // If this was the currently selected user, clear the selection
      if (req.session.selectedUserId === lightspeedUserId) {
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