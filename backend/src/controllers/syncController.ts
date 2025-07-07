import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import { syncCustomers, syncProducts } from '../services/syncService';
import logger from '../utils/logger';
import { createLightspeedClient } from '../lightspeedClient';

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
    const errors = statuses.filter(s => s.status === 'FAILED' && s.errorMessage).map(s => `${s.resource}: ${s.errorMessage}`);
    res.status(200).json({ statuses: sanitizedStatuses, errors });
  } catch (error: any) {
    logger.error('Failed to get sync statuses:', { message: error.message, stack: error.stack });
    res.status(500).json({ message: 'Failed to retrieve sync statuses.' });
  }
};

export const triggerSync = async (req: Request, res: Response) => {
  logger.info('[SyncController] Trigger sync called', {
    user: (req as any).user || null,
    sessionId: req.sessionID,
    resource: req.params.resource,
    time: new Date().toISOString()
  });
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
    logger.error('[SyncController] Sync error', { error: error, resource: req.params.resource, user: (req as any).user, sessionId: req.sessionID });
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

export const previewCustomerSync = async (req: Request, res: Response) => {
  try {
    // Get all customers from Lightspeed
    const lightspeedClient = createLightspeedClient(req);
    const lsCustomers = await lightspeedClient.fetchAllWithPagination('/customers', {});
    // Get all local customers
    const localCustomers = await prisma.customer.findMany({ select: { lightspeedId: true, lightspeedVersion: true } });
    const localMap = new Map(localCustomers.map(c => [c.lightspeedId, c.lightspeedVersion ? c.lightspeedVersion.toString() : null]));
    let newCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;
    for (const ls of lsCustomers) {
      const id = ls.id?.toString();
      const version = ls.version ? ls.version.toString() : null;
      if (!id) continue;
      if (!localMap.has(id)) {
        newCount++;
      } else if (localMap.get(id) !== version) {
        updatedCount++;
      } else {
        unchangedCount++;
      }
    }
    res.json({ new: newCount, updated: updatedCount, unchanged: unchangedCount, total: lsCustomers.length });
  } catch (error: any) {
    logger.error('Failed to preview customer sync:', error);
    res.status(500).json({ message: 'Failed to preview customer sync', error: error.message });
  }
};

export { syncCustomers, syncProducts }; 