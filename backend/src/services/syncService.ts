import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import logger from '../utils/logger';
import { createLightspeedClient } from '../lightspeedClient';
import pLimit from 'p-limit';
import schedule from 'node-schedule';
import { setTimeout as setTimeoutPromise } from 'timers/promises';
import { PrismaClient as PrismaClientRaw } from '@prisma/client';

const prisma = new PrismaClient().$extends(withAccelerate());
const prismaRaw = new PrismaClientRaw();

type Mapper<T> = (item: any) => Omit<T, 'id'>;

type PrismaModel<T> = {
  upsert: (args: any) => Promise<T>;
};

async function getPersistentLightspeedToken() {
  const token = await prismaRaw.apiToken.findUnique({ where: { service: 'lightspeed' } });
  if (!token || !token.accessToken) throw new Error('No persistent Lightspeed access token found');
  return token;
}

function buildReqWithPersistentToken(req: any) {
  // Always use the persistent token for sync jobs
  return {
    ...req,
    session: {
      ...(req?.session || {}),
      lsAccessToken: req?.session?.lsAccessToken || undefined,
      lsRefreshToken: req?.session?.lsRefreshToken || undefined,
      lsDomainPrefix: req?.session?.lsDomainPrefix || undefined,
      ...{
        lsAccessToken: undefined,
        lsRefreshToken: undefined,
        lsDomainPrefix: undefined,
      },
    },
    _forcePersistentToken: true,
  };
}

/**
 * A generic function to sync a resource from Lightspeed to the local database.
 */
async function syncResource<T>(req: any, resourceName: string, endpoint: string, model: PrismaModel<T>, mapper: Mapper<T>) {
  logger.info(`[SyncService] Starting Lightspeed sync for resource: ${resourceName}`);
  logger.info(`[SyncService] Incoming req object:`, JSON.stringify(req));
  const SYNC_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
  let syncTimedOut = false;
  let syncCompleted = false;
  const timeoutPromise = setTimeoutPromise(SYNC_TIMEOUT_MS).then(() => {
    if (!syncCompleted) {
      syncTimedOut = true;
      logger.error(`[SyncService] Sync for ${resourceName} timed out after ${SYNC_TIMEOUT_MS / 1000}s`);
      prisma.syncStatus.update({
        where: { resource: resourceName },
        data: {
          status: 'FAILED',
          lastSyncedAt: new Date(),
          errorMessage: `Sync timed out after ${SYNC_TIMEOUT_MS / 1000}s`,
        },
      }).catch(e => logger.error(`[SyncService] Failed to update sync status on timeout:`, e));
    }
  });
  try {
    await prisma.syncStatus.upsert({
      where: { resource: resourceName },
      update: { status: 'SYNCING', errorMessage: null },
      create: { resource: resourceName, status: 'SYNCING' },
    });

    // Add a log to check if persistent token fallback is being used
    if (!req?.session?.lsAccessToken) {
      logger.info(`[SyncService] No session access token, persistent token fallback should be used.`);
    }

    let persistentToken;
    try {
      persistentToken = await getPersistentLightspeedToken();
    } catch (e) {
      logger.error(`[SyncService] Could not load persistent Lightspeed token:`, e);
      await prisma.syncStatus.update({
        where: { resource: resourceName },
        data: {
          status: 'FAILED',
          lastSyncedAt: new Date(),
          errorMessage: 'No persistent Lightspeed access token',
        },
      });
      return;
    }
    const reqWithToken = {
      ...req,
      session: {
        ...(req?.session || {}),
        lsAccessToken: persistentToken.accessToken,
        lsRefreshToken: persistentToken.refreshToken,
        lsDomainPrefix: process.env.LS_DOMAIN || persistentToken.domainPrefix || req?.session?.lsDomainPrefix,
      },
      _forcePersistentToken: true,
    };

    const lightspeedClient = createLightspeedClient(reqWithToken);
    const syncStatus = await prisma.syncStatus.findUnique({ where: { resource: resourceName } });
    const lastSyncedVersion = syncStatus?.lastSyncedVersion;
    const params: Record<string, any> = {};
    if (lastSyncedVersion) {
      params.after = lastSyncedVersion.toString();
      logger.info(`[SyncService] Performing incremental sync for ${resourceName} after version ${lastSyncedVersion}`);
    } else {
      logger.info(`[SyncService] No previous sync status found. Performing a full sync for ${resourceName}.`);
    }

    let allItems;
    try {
      allItems = await lightspeedClient.fetchAllWithPagination(endpoint, params);
      logger.info(`[SyncService] Fetched ${allItems?.length || 0} items from Lightspeed for ${resourceName}`);
    } catch (fetchErr) {
      logger.error(`[SyncService] Error fetching items from Lightspeed:`, fetchErr);
      throw fetchErr;
    }

    if (!allItems || allItems.length === 0) {
      logger.info(`[SyncService] No new or updated ${resourceName} to sync.`);
      await prisma.syncStatus.update({
        where: { resource: resourceName },
        data: { status: 'SUCCESS', lastSyncedAt: new Date(), errorMessage: null },
      });
      syncCompleted = true;
      return;
    }

    logger.info(`[SyncService] Found ${allItems.length} ${resourceName} in Lightspeed. Syncing with local database...`);

    let maxVersion = syncStatus?.lastSyncedVersion || BigInt(0);
    let upsertedCount = 0;
    let failedCount = 0;
    const failedItems: any[] = [];

    // Limit concurrency for external API calls (e.g., 5 at a time)
    const limit = pLimit(5);

    // Upsert all customers in parallel (with concurrency limit)
    await Promise.race([
      Promise.all(
        allItems.map(item => limit(async () => {
          try {
            const idRaw = (item as { id: string | number }).id;
            const id = typeof idRaw === 'string' ? parseInt(idRaw, 10) : idRaw;
            if (!id) {
              logger.warn(`[SyncService] Skipping item in ${resourceName} with missing ID.`, { item });
              failedCount++;
              failedItems.push({ item, error: 'Missing ID' });
              return;
            }
            const versionRaw = (item as { id: string | number; version?: string | number }).version;
            const version = versionRaw ? BigInt(versionRaw.toString()) : BigInt(0);
            if (version > maxVersion) {
              maxVersion = version;
            }
            const mappedData = mapper(item);
            logger.info(`[SyncService] Upserting ${resourceName} item with ID ${id}`);
            const customer = await model.upsert({
              where: { lightspeedId: id.toString() },
              update: mappedData,
              create: mappedData,
            });
            logger.info(`[SyncService] Upserted ${resourceName} item with ID ${id}`);
            // --- GOLD STANDARD: Sync tags, custom fields, groups ---
            await Promise.all([
              // Tags
              limit(async () => {
                try {
                  const tagsResp = await lightspeedClient.get(`/customers/${id}/tags`);
                  const tags = tagsResp?.data?.data || [];
                  if (Array.isArray(tags)) {
                    await Promise.all(tags.map(tag =>
                      prisma.customerTag.upsert({
                        where: { name: tag.name },
                        update: {},
                        create: { name: tag.name },
                      }).then(tagRec => {
                        const tagRecIdRaw = (tagRec as { id: string | number }).id;
                        const tagRecId = typeof tagRecIdRaw === 'string' ? parseInt(tagRecIdRaw, 10) : tagRecIdRaw;
                        return prisma.customer.update({
                          where: { id: id },
                          data: { tags: { connect: { id: tagRecId } } },
                        });
                      })
                    ));
                  }
                } catch (err) {
                  logger.error(`[SyncService] Failed to sync tags for customer ${id}:`, (err as any)?.message || err);
                }
              }),
              // Custom Fields
              limit(async () => {
                try {
                  const fieldsResp = await lightspeedClient.get(`/customers/${id}/CustomFieldValues`);
                  const fields = fieldsResp?.data?.data || [];
                  if (Array.isArray(fields)) {
                    await Promise.all(fields.map(field =>
                      prisma.customerCustomField.upsert({
                        where: { customerId_key: { customerId: id, key: field.customFieldName } },
                        update: { value: field.value },
                        create: { customerId: id, key: field.customFieldName, value: field.value },
                      })
                    ));
                  }
                } catch (err) {
                  logger.error(`[SyncService] Failed to sync custom fields for customer ${id}:`, (err as any)?.message || err);
                }
              }),
              // Groups
              limit(async () => {
                try {
                  const groupsResp = await lightspeedClient.get(`/customer_groups`);
                  const groups = groupsResp?.data?.data || [];
                  await Promise.all(groups.map(async (group: any) => {
                    if (Array.isArray(group.customers) && group.customers.some((c: any) => c.id == id)) {
                      const groupRec = await prisma.customerGroup.upsert({
                        where: { name_externalId: { name: group.name, externalId: group.id.toString() } },
                        update: {},
                        create: { name: group.name, externalId: group.id.toString() },
                      });
                      const groupRecIdRaw = (groupRec as { id: string | number }).id;
                      const groupRecId = typeof groupRecIdRaw === 'string' ? parseInt(groupRecIdRaw, 10) : groupRecIdRaw;
                      await prisma.customer.update({
                        where: { id: id },
                        data: { groups: { connect: { id: groupRecId } } },
                      });
                    }
                  }));
                } catch (err) {
                  logger.error(`[SyncService] Failed to sync groups for customer ${id}:`, (err as any)?.message || err);
                }
              })
            ]);
            // --- END GOLD STANDARD ---
            upsertedCount++;
          } catch (loopError: any) {
            failedCount++;
            const idRaw = (item as { id: string | number }).id;
            const id = typeof idRaw === 'string' ? parseInt(idRaw, 10) : idRaw;
            const itemIdentifier = id || JSON.stringify(item);
            logger.error(`[SyncService] Failed to process item ${itemIdentifier} for ${resourceName}.`, { error: (loopError as any)?.message || loopError, item });
            failedItems.push({ item, error: (loopError as any)?.message || loopError });
          }
        })
      ),
      timeoutPromise
    ]);
    if (syncTimedOut) {
      logger.error(`[SyncService] Sync for ${resourceName} did not complete due to timeout.`);
      return;
    }
    const finalErrorMessage = failedCount > 0
      ? `Sync completed with ${failedCount} error(s). First error on item ID ${(failedItems[0]?.item as { id: string | number; version?: string | number }).id}: ${failedItems[0]?.error}`
      : null;

    await prisma.syncStatus.update({
      where: { resource: resourceName },
      data: {
        status: failedCount > 0 ? 'FAILED' : 'SUCCESS',
        lastSyncedVersion: maxVersion,
        lastSyncedAt: new Date(),
        errorMessage: finalErrorMessage,
      },
    });

    logger.info(`[SyncService] ${resourceName} synchronization complete. Upserted: ${upsertedCount}, Failed: ${failedCount}. New version: ${maxVersion}`);
    if (failedCount > 0) {
      logger.error(`[SyncService] ${resourceName} sync completed with errors: ${finalErrorMessage}`);
    }
    syncCompleted = true;
  } catch (error: any) {
    logger.error(`[SyncService] Sync for ${resourceName} failed:`, error);
    await prisma.syncStatus.update({
      where: { resource: resourceName },
      data: {
        status: 'FAILED',
        lastSyncedAt: new Date(),
        errorMessage: error.message || 'Unknown error',
      },
    });
  } finally {
    syncCompleted = true;
  }
}

const customerMapper = (c: any) => ({
  name: c.name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unknown Customer',
  email: c.email || null,
  phone: c.phone || c.mobile || null,
  address: c.address_1 ? `${c.address_1}${c.address_2 ? ', ' + c.address_2 : ''}${c.city ? ', ' + c.city : ''}${c.state ? ', ' + c.state : ''}${c.postcode ? ' ' + c.postcode : ''}`.trim() : null,
  lightspeedId: (c as { id: string | number }).id.toString(),
  lightspeedVersion: BigInt(c.version || 0),
  syncedAt: new Date(),
  createdAt: c.created_at ? new Date(c.created_at) : new Date(),
  updatedAt: c.updated_at ? new Date(c.updated_at) : new Date(),
  createdBy: null, // Lightspeed customers don't have a local creator
});

const productMapper = (p: any) => ({
  name: p.name || 'Unknown Product',
  sku: p.sku || null,
  price: parseFloat(p.price || '0') || 0,
  category: p.category?.name || null,
  brand: p.brand?.name || null,
  lightspeedId: (p as { id: string | number }).id.toString(),
  lightspeedVersion: BigInt(p.version || 0),
  syncedAt: new Date(),
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
          const userIdRaw = (user as { id: string | number }).id;
          const userId = typeof userIdRaw === 'string' ? parseInt(userIdRaw, 10) : userIdRaw;
          await prisma.user.update({ where: { id: userId }, data: { photoUrl: newPhotoUrl } });
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

// Schedule auto-sync for customers every 5 minutes
schedule.scheduleJob('*/5 * * * *', async () => {
  try {
    logger.info('[AutoSync] Triggered scheduled customer sync job.');
    const req = { system: true };
    logger.info('[AutoSync] Scheduled sync req object:', JSON.stringify(req));
    await syncCustomers(req);
  } catch (err) {
    logger.error('[AutoSync] Scheduled customer sync failed:', err);
  }
}); 