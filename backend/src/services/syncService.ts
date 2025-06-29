import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import logger from '../utils/logger';
import { createLightspeedClient } from '../lightspeedClient';

const prisma = new PrismaClient().$extends(withAccelerate());

type Mapper<T> = (item: any) => T;

type PrismaModel<T> = {
  upsert: (args: any) => Promise<T>;
};

/**
 * A generic function to sync a resource from Lightspeed to the local database.
 */
async function syncResource<T>(req: any, resourceName: string, endpoint: string, model: PrismaModel<T>, mapper: Mapper<T>) {
  logger.info(`[SyncService] Starting Lightspeed sync for resource: ${resourceName}`);

  try {
    await prisma.syncStatus.upsert({
      where: { resource: resourceName },
      update: { status: 'SYNCING', errorMessage: null },
      create: { resource: resourceName, status: 'SYNCING' },
    });

    const lightspeedClient = createLightspeedClient(req);
    const syncStatus = await prisma.syncStatus.findUnique({ where: { resource: resourceName } });
    const lastSyncedVersion = syncStatus?.lastSyncedVersion;
    const params: Record<string, any> = {};
    if (lastSyncedVersion) {
      params.after = lastSyncedVersion.toString();
      logger.info(`[SyncService] Performing incremental sync for ${resourceName} after version ${lastSyncedVersion}`);
    } else {
      logger.info(`[SyncService] No previous sync status found. Performing a full sync for ${resourceName}.`);
    }

    const allItems = await lightspeedClient.fetchAllWithPagination(endpoint, params);
    if (!allItems || allItems.length === 0) {
      logger.info(`[SyncService] No new or updated ${resourceName} to sync.`);
      await prisma.syncStatus.update({
        where: { resource: resourceName },
        data: { status: 'SUCCESS', lastSyncedAt: new Date() },
      });
      return;
    }

    logger.info(`[SyncService] Found ${allItems.length} ${resourceName} in Lightspeed. Syncing with local database...`);

    let maxVersion = syncStatus?.lastSyncedVersion || BigInt(0);
    let upsertedCount = 0;
    let failedCount = 0;
    const failedItems: any[] = [];

    for (const i of allItems) {
      const item: any = i;
      try {
        if (!item.id) {
          logger.warn(`[SyncService] Skipping item in ${resourceName} with missing ID.`, { item });
          failedCount++;
          failedItems.push({ item, error: 'Missing ID' });
          continue;
        }
        const version = BigInt(item.version || 0);
        if (version > maxVersion) {
          maxVersion = version;
        }
        const mappedData = mapper(item);
        await model.upsert({
          where: { lightspeedId: item.id.toString() },
          update: mappedData,
          create: {
            lightspeedId: item.id.toString(),
            ...mappedData,
          },
        });
        upsertedCount++;
      } catch (loopError: any) {
        failedCount++;
        const itemIdentifier = item.id || JSON.stringify(item);
        logger.error(`[SyncService] Failed to process item ${itemIdentifier} for ${resourceName}.`, { error: loopError.message, item });
        failedItems.push({ item, error: loopError.message });
      }
    }

    const finalErrorMessage = failedCount > 0
      ? `Sync completed with ${failedCount} error(s). First error on item ID ${failedItems[0]?.item?.id}: ${failedItems[0]?.error}`
      : null;

    await prisma.syncStatus.update({
      where: { resource: resourceName },
      data: {
        status: 'SUCCESS',
        lastSyncedVersion: maxVersion,
        lastSyncedAt: new Date(),
        errorMessage: finalErrorMessage,
      },
    });

    logger.info(`[SyncService] ${resourceName} synchronization complete. Upserted: ${upsertedCount}, Failed: ${failedCount}. New version: ${maxVersion}`);
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message || 'An unknown error occurred during sync.';
    logger.error(`[SyncService] Critical error during ${resourceName} synchronization: ${errorMessage}`, {
      fullError: error.stack,
    });
    await prisma.syncStatus.upsert({
      where: { resource: resourceName },
      update: {
        status: 'FAILED',
        errorMessage: errorMessage,
      },
      create: {
        resource: resourceName,
        status: 'FAILED',
        errorMessage: errorMessage,
      }
    });
  }
}

const customerMapper = (c: any) => ({
  id: c.id,
  name: c.name,
  email: c.email,
  phone: c.phone,
  address: c.address,
  lightspeedId: c.lightspeedId,
  lightspeedVersion: BigInt(c.lightspeedVersion || 0),
  syncedAt: new Date(),
  createdAt: c.createdAt ? new Date(c.createdAt) : new Date(),
  updatedAt: c.updatedAt ? new Date(c.updatedAt) : new Date(),
  createdBy: c.createdBy || null,
});

const productMapper = (p: any) => ({
  id: p.id,
  name: p.name,
  sku: p.sku,
  price: p.price,
  lightspeedId: p.lightspeedId,
  lightspeedVersion: BigInt(p.lightspeedVersion || 0),
  syncedAt: new Date(),
  createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
  updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date(),
  category: p.category || null,
  brand: p.brand || null,
});

export const syncCustomers = (req: any) => syncResource(req, 'customers', '/customers', prisma.customer, customerMapper);
export const syncProducts = (req: any) => syncResource(req, 'products', '/products', prisma.product, productMapper);

export function initScheduledSync(req: any) {
  const syncs = [
    { name: 'Customers', func: () => syncCustomers(req), interval: 60 * 60 * 1000 },
    { name: 'Products', func: () => syncProducts(req), interval: 4 * 60 * 60 * 1000 },
  ];
  syncs.forEach(sync => {
    logger.info(`[SyncService] Initializing scheduled sync for ${sync.name}.`);
    sync.func();
    setInterval(sync.func, sync.interval);
  });
}

export async function syncUserPhotos(req: any): Promise<void> {
  try {
    logger.info('[SyncService] Starting user photo sync...');
    const client = createLightspeedClient(req);
    const users = await prisma.user.findMany({
      where: { lightspeedEmployeeId: { not: null } },
      select: { id: true, lightspeedEmployeeId: true, photoUrl: true, name: true, updatedAt: true }
    });
    logger.info(`[SyncService] Found ${users.length} users with Lightspeed IDs to sync photos for`);
    let updatedCount = 0;
    for (const user of users) {
      try {
        const response = await client.get(`/users/${user.lightspeedEmployeeId}`);
        if (!response) throw new Error('No response from Lightspeed');
        const lightspeedUser: any = response.data.data;
        logger.info(`[SyncService] User ${user.name} - Available Lightspeed fields:`, Object.keys(lightspeedUser));
        logger.info(`[SyncService] User ${user.name} - Image fields:`, {
          image_source: lightspeedUser.image_source,
          image: lightspeedUser.image,
          avatar: lightspeedUser.avatar,
          photo: lightspeedUser.photo,
          profile_image: lightspeedUser.profile_image,
          display_name: lightspeedUser.display_name,
          email: lightspeedUser.email
        });
        const newPhotoUrl = lightspeedUser.image_source || lightspeedUser.image || lightspeedUser.avatar || lightspeedUser.photo || lightspeedUser.profile_image;
        logger.info(`[SyncService] User ${user.name} - Current photo: ${user.photoUrl}, New photo: ${newPhotoUrl}`);
        if (newPhotoUrl && newPhotoUrl !== user.photoUrl) {
          await prisma.user.update({ where: { id: user.id }, data: { photoUrl: newPhotoUrl } });
          logger.info(`[SyncService] Updated photo for user ${user.name}: ${newPhotoUrl}`);
          updatedCount++;
        } else if (!newPhotoUrl) {
          logger.info(`[SyncService] No photo URL found for user ${user.name}`);
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error: any) {
        logger.error(`[SyncService] Failed to sync photo for user ${user.name}:`, error.message);
      }
    }
    logger.info(`[SyncService] User photo sync completed. Updated ${updatedCount} photos.`);
  } catch (error: any) {
    logger.error('[SyncService] Error during user photo sync:', error);
  }
} 