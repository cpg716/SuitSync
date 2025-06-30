import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import logger from '../utils/logger';
// Placeholder for createLightspeedClient; replace with actual import if available
const { createLightspeedClient } = require('../lightspeedClient');

const prisma = new PrismaClient().$extends(withAccelerate());

export const getLightspeedHealth = async (req: Request, res: Response) => {
  const lightspeedClient = createLightspeedClient(req);
  let lightspeedConnection = 'OK';
  let lightspeedApiError = null;
  try {
    const retailerResponse = await lightspeedClient.get('/retailer');
    logger.info('[Lightspeed Health] API connectivity check successful.', {
      retailer: retailerResponse.data?.data?.name || 'Unknown',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    lightspeedConnection = 'ERROR';
    lightspeedApiError = error.response?.data?.message || error.message || 'An unknown API error occurred.';
    logger.error(`[Lightspeed Health] API connectivity check failed: ${lightspeedApiError}`, {
      status: error.response?.status,
      timestamp: new Date().toISOString()
    });
  }
  try {
    const statuses = await prisma.syncStatus.findMany({ orderBy: { resource: 'asc' } });
    const sanitizedStatuses = statuses.map(s => ({
      ...s,
      lastSyncedVersion: s.lastSyncedVersion?.toString() || null,
      lastSyncedAt: s.lastSyncedAt?.toISOString() || null,
      createdAt: s.createdAt?.toISOString() || null,
      updatedAt: s.updatedAt?.toISOString() || null,
    }));
    res.status(200).json({
      lightspeedConnection,
      lightspeedApiError,
      syncStatuses: sanitizedStatuses,
    });
  } catch (dbError: any) {
    logger.error('[Lightspeed Health] Failed to get sync statuses from DB:', {
      message: dbError.message,
      stack: dbError.stack,
    });
    res.status(500).json({
      lightspeedConnection,
      lightspeedApiError,
      syncStatuses: [],
      databaseError: 'Failed to retrieve sync statuses from the database.'
    });
  }
};

export const deleteLightspeedUserSessions = async (req: Request, res: Response) => {
  const { userId } = req.params;
  try {
    const lightspeedClient = createLightspeedClient(null);
    await lightspeedClient.delete(`/users/${userId}/sessions`);
    logger.info(`[Lightspeed] Deleted all sessions for user ${userId}`);
    res.status(204).send();
  } catch (error: any) {
    logger.error(`[Lightspeed] Failed to delete sessions for user ${userId}:`, error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to delete user sessions', details: error.response?.data || error.message });
  }
}; 