import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import { syncCustomers, syncProducts, syncUserPhotos } from '../services/syncService';
import logger from '../utils/logger';

const prisma = new PrismaClient().$extends(withAccelerate());

export const getSyncStatus = async (req: Request, res: Response) => {
  try {
    const statuses = await prisma.syncStatus.findMany({ orderBy: { resource: 'asc' } });
    const sanitizedStatuses = statuses.map(s => ({
      ...s,
      lastSyncedVersion: s.lastSyncedVersion?.toString() || null,
      lastSyncedAt: s.lastSyncedAt?.toISOString() || null,
      createdAt: s.createdAt?.toISOString() || null,
      updatedAt: s.updatedAt?.toISOString() || null,
    }));
    res.status(200).json(sanitizedStatuses);
  } catch (error: any) {
    logger.error('Failed to get sync statuses:', { message: error.message, stack: error.stack });
    res.status(500).json({ message: 'Failed to retrieve sync statuses.' });
  }
};

export const triggerSync = async (req: Request, res: Response) => {
  const { resource } = req.params;
  const userId = (req as any).user.id;
  const syncFunctions: Record<string, (req: Request) => Promise<void>> = {
    customers: syncCustomers,
    products: syncProducts,
  };
  if (!syncFunctions[resource]) {
    return res.status(400).json({ message: `Syncing for resource '${resource}' is not supported.` });
  }
  try {
    // Start sync in background but don't wait for completion
    syncFunctions[resource](req).catch(error => {
      logger.error(`Background sync failed for '${resource}':`, error);
    });
    logger.info(`Manual sync triggered for '${resource}' by user ${userId}`);
    res.status(202).json({ message: `Synchronization for ${resource} has been initiated.` });
  } catch (error: any) {
    logger.error(`Failed to trigger sync for '${resource}':`, error);
    res.status(500).json({ message: `Failed to start synchronization for ${resource}.` });
  }
};

export const getSyncErrors = async (req: Request, res: Response) => {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const errors = await prisma.syncLog.findMany({
    where: { status: 'failed', createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
    select: { id: true, message: true, createdAt: true },
    take: 20,
  });
  res.json(errors);
};

export const resetSyncStatus = async (req: Request, res: Response) => {
  try {
    await prisma.syncStatus.deleteMany({});
    logger.info(`Sync statuses reset by user ${(req as any).user.id}`);
    res.status(200).json({ message: 'All sync statuses have been reset.' });
  } catch (error: any) {
    logger.error('Failed to reset sync statuses:', error);
    res.status(500).json({ message: 'Failed to reset sync statuses.' });
  }
};

export const manualUserPhotoSync = async (req: Request, res: Response) => {
  try {
    syncUserPhotos(req).catch(err => {
      logger.error('Background user photo sync failed:', err);
    });
    res.json({ message: 'User photo sync started', timestamp: new Date().toISOString() });
  } catch (error: any) {
    logger.error('Error starting user photo sync:', error);
    res.status(500).json({ error: 'Failed to start user photo sync' });
  }
}; 