import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import logger from '../utils/logger';

const prisma = new PrismaClient().$extends(withAccelerate());

/**
 * Tailor Selection Controller
 * 
 * Handles tailor selection persistence for QR code workflows
 */
export class TailorSelectionController {

  /**
   * Get available tailors for selection
   */
  static async getAvailableTailors(req: Request, res: Response): Promise<void> {
    try {
      const tailors = await prisma.user.findMany({
        where: {
          role: 'tailor',
          isActive: true
        },
        select: {
          id: true,
          name: true,
          email: true,
          photoUrl: true,
          role: true
        },
        orderBy: {
          name: 'asc'
        }
      });

      res.json({
        success: true,
        tailors,
        total: tailors.length
      });
    } catch (error) {
      logger.error('Failed to get available tailors:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve available tailors'
      });
    }
  }

  /**
   * Save tailor selection for a session
   */
  static async saveTailorSelection(req: Request, res: Response): Promise<void> {
    try {
      const { tailorId, sessionId, deviceInfo } = req.body;

      if (!tailorId || !sessionId) {
        res.status(400).json({
          success: false,
          error: 'tailorId and sessionId are required'
        });
        return;
      }

      // Verify the tailor exists and is active
      const tailor = await prisma.user.findFirst({
        where: {
          id: tailorId,
          role: 'tailor',
          isActive: true
        }
      });

      if (!tailor) {
        res.status(404).json({
          success: false,
          error: 'Tailor not found or inactive'
        });
        return;
      }

      // Upsert the tailor selection session
      const selectionSession = await prisma.tailorSelectionSession.upsert({
        where: { sessionId },
        update: {
          selectedTailorId: tailorId,
          lastUsed: new Date(),
          deviceInfo: deviceInfo || null
        },
        create: {
          sessionId,
          selectedTailorId: tailorId,
          deviceInfo: deviceInfo || null
        }
      });

      logger.info(`Tailor selection saved for session ${sessionId}: ${tailor.name} (ID: ${tailorId})`);

      res.json({
        success: true,
        message: 'Tailor selection saved',
        tailor: {
          id: tailor.id,
          name: tailor.name,
          email: tailor.email,
          photoUrl: tailor.photoUrl
        }
      });
    } catch (error) {
      logger.error('Failed to save tailor selection:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to save tailor selection'
      });
    }
  }

  /**
   * Get the last selected tailor for a session
   */
  static async getLastSelectedTailor(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        res.status(400).json({
          success: false,
          error: 'sessionId is required'
        });
        return;
      }

      const selectionSession = await prisma.tailorSelectionSession.findUnique({
        where: { sessionId },
        include: {
          selectedTailor: {
            select: {
              id: true,
              name: true,
              email: true,
              photoUrl: true,
              role: true
            }
          }
        }
      });

      if (!selectionSession) {
        res.json({
          success: true,
          hasSelection: false,
          tailor: null
        });
        return;
      }

      // Check if the selected tailor is still active
      if (!selectionSession.selectedTailor || selectionSession.selectedTailor.role !== 'tailor') {
        // Remove the invalid selection
        await prisma.tailorSelectionSession.delete({
          where: { sessionId }
        });

        res.json({
          success: true,
          hasSelection: false,
          tailor: null
        });
        return;
      }

      res.json({
        success: true,
        hasSelection: true,
        tailor: selectionSession.selectedTailor,
        lastUsed: selectionSession.lastUsed
      });
    } catch (error) {
      logger.error('Failed to get last selected tailor:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve last selected tailor'
      });
    }
  }

  /**
   * Clear tailor selection for a session
   */
  static async clearTailorSelection(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        res.status(400).json({
          success: false,
          error: 'sessionId is required'
        });
        return;
      }

      await prisma.tailorSelectionSession.delete({
        where: { sessionId }
      });

      logger.info(`Tailor selection cleared for session ${sessionId}`);

      res.json({
        success: true,
        message: 'Tailor selection cleared'
      });
    } catch (error) {
      logger.error('Failed to clear tailor selection:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to clear tailor selection'
      });
    }
  }

  /**
   * Get all active tailor selection sessions
   */
  static async getActiveTailorSessions(req: Request, res: Response): Promise<void> {
    try {
      const sessions = await prisma.tailorSelectionSession.findMany({
        include: {
          selectedTailor: {
            select: {
              id: true,
              name: true,
              email: true,
              photoUrl: true
            }
          }
        },
        orderBy: {
          lastUsed: 'desc'
        }
      });

      res.json({
        success: true,
        sessions,
        total: sessions.length
      });
    } catch (error) {
      logger.error('Failed to get active tailor sessions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve active tailor sessions'
      });
    }
  }
} 