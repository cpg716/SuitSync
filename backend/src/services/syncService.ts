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
      lsDomainPrefix: req?.session?.lsDomainPrefix || undefined
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
  logger.info(`[SyncService] Session access token: ${req?.session?.lsAccessToken || 'NONE'}`);
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
      logger.info(`[SyncService] Loaded persistent Lightspeed token:`, persistentToken);
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
        lsDomainPrefix: process.env.LS_DOMAIN || req?.session?.lsDomainPrefix,
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
    const upsertResults = await Promise.all(
      allItems.map(item => limit(async () => {
        try {
          const idRaw = (item as { id: string | number }).id;
          const id = typeof idRaw === 'string' ? parseInt(idRaw, 10) : idRaw;
          if (!id) {
            logger.warn(`[SyncService] Skipping item in ${resourceName} with missing ID.`, { item });
            failedCount++;
            failedItems.push({ item, error: 'Missing ID' });
            return null;
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
          return customer;
        } catch (loopError: any) {
          failedCount++;
          const idRaw = (item as { id: string | number }).id;
          const id = typeof idRaw === 'string' ? parseInt(idRaw, 10) : idRaw;
          const itemIdentifier = id || JSON.stringify(item);
          logger.error(`[SyncService] Failed to process item ${itemIdentifier} for ${resourceName}.`, { error: (loopError as any)?.message || loopError, item });
          failedItems.push({ item, error: (loopError as any)?.message || loopError });
          return null;
        }
      }))
    );

    // 2. Count how many succeeded
    upsertedCount = upsertResults.filter(Boolean).length;
    logger.info(`[SyncService] ${resourceName} synchronization complete. Upserted: ${upsertedCount}, Failed: ${failedCount}. New version: ${maxVersion}`);

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
        status: finalErrorMessage ? 'FAILED' : 'SUCCESS',
        lastSyncedAt: new Date(),
        errorMessage: finalErrorMessage,
      },
    });
    logger.info(`[SyncService] Sync status updated for ${resourceName}: ${finalErrorMessage ? 'FAILED' : 'SUCCESS'}`);
    syncCompleted = true;
  } catch (e) {
    logger.error(`[SyncService] Error syncing resource ${resourceName}:`, e);
    await prisma.syncStatus.update({
      where: { resource: resourceName },
      data: {
        status: 'FAILED',
        lastSyncedAt: new Date(),
        errorMessage: e instanceof Error ? e.message : String(e),
      },
    });
  }
}

const syncCustomers = async (req: any) => {
  const persistentToken = await getPersistentLightspeedToken();
  const reqWithToken = {
    ...req,
    session: {
      ...(req?.session || {}),
      lsAccessToken: persistentToken.accessToken,
      lsRefreshToken: persistentToken.refreshToken,
      lsDomainPrefix: process.env.LS_DOMAIN || req?.session?.lsDomainPrefix,
    },
    _forcePersistentToken: true,
  };
  const lightspeedClient = createLightspeedClient(reqWithToken);
  const items = await lightspeedClient.fetchAllWithPagination('/customers', {});
  const BATCH_SIZE = 10;
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map((item: any) =>
        prisma.customer.upsert({
          where: { lightspeedId: item.id?.toString() },
          create: {
            lightspeedId: item.id?.toString(),
            first_name: item.first_name || null,
            last_name: item.last_name || null,
            name: (() => { // Deprecated, for migration only
              const first = item.first_name === '?' ? '' : (item.first_name || '');
              const last = item.last_name === '?' ? '' : (item.last_name || '');
              const full = [first, last].filter(Boolean).join(' ');
              return full || 'N/A';
            })(),
            email: item.email ? item.email : 'N/A',
            phone: item.phone ? item.phone : 'N/A',
            address: item.address || null,
            createdAt: item.created_at ? new Date(item.created_at) : new Date(),
            updatedAt: item.updated_at ? new Date(item.updated_at) : new Date(),
            lightspeedVersion: item.version ? BigInt(item.version) : null,
            syncedAt: new Date(),
            createdBy: null,
          },
          update: {
            first_name: item.first_name || null,
            last_name: item.last_name || null,
            name: (() => { // Deprecated, for migration only
              const first = item.first_name === '?' ? '' : (item.first_name || '');
              const last = item.last_name === '?' ? '' : (item.last_name || '');
              const full = [first, last].filter(Boolean).join(' ');
              return full || 'N/A';
            })(),
            email: item.email ? item.email : 'N/A',
            phone: item.phone ? item.phone : 'N/A',
            address: item.address || null,
            updatedAt: item.updated_at ? new Date(item.updated_at) : new Date(),
            lightspeedVersion: item.version ? BigInt(item.version) : null,
            syncedAt: new Date(),
          },
        })
      )
    );
  }
  // Always set syncStatus to SUCCESS after a successful sync
  await prisma.syncStatus.updateMany({
    where: { resource: 'customers' },
    data: {
      status: 'SUCCESS',
      errorMessage: null,
      lastSyncedAt: new Date(),
    },
  });
};

const syncSales = async (req: any) => {
  const persistentToken = await getPersistentLightspeedToken();
  const reqWithToken = {
    ...req,
    session: {
      ...(req?.session || {}),
      lsAccessToken: persistentToken.accessToken,
      lsRefreshToken: persistentToken.refreshToken,
      lsDomainPrefix: process.env.LS_DOMAIN || req?.session?.lsDomainPrefix,
    },
    _forcePersistentToken: true,
  };
  const lightspeedClient = createLightspeedClient(reqWithToken);
  const items = await lightspeedClient.fetchAllWithPagination('/sales', {});
  const BATCH_SIZE = 10;
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map((item: any) =>
        prisma.sale.upsert({
          where: { lightspeedId: item.id?.toString() },
          create: {
            lightspeedId: item.id?.toString(),
            total: item.total_amount ? parseFloat(item.total_amount) : 0,
            saleDate: item.created_at ? new Date(item.created_at) : new Date(),
            customerId: 1, // Default customer ID - will need to be linked properly
            syncedAt: new Date(),
          },
          update: {
            total: item.total_amount ? parseFloat(item.total_amount) : 0,
            saleDate: item.created_at ? new Date(item.created_at) : new Date(),
            syncedAt: new Date(),
          },
        })
      )
    );
  }
  
  // Sync sale line items for commission tracking
  for (const sale of items) {
    if (sale.sale_line_items && Array.isArray(sale.sale_line_items)) {
      for (const lineItem of sale.sale_line_items) {
        await prisma.saleLineItem.upsert({
          where: { lightspeedId: lineItem.id?.toString() },
          create: {
            lightspeedId: lineItem.id?.toString(),
            saleId: parseInt(sale.id?.toString()) || 0,
            productId: parseInt(lineItem.product_id?.toString()) || 1, // Default product ID
            quantity: lineItem.quantity || 1,
            price: lineItem.total_price ? parseFloat(lineItem.total_price) : 0,
            syncedAt: new Date(),
          },
          update: {
            saleId: parseInt(sale.id?.toString()) || 0,
            productId: parseInt(lineItem.product_id?.toString()) || 1,
            quantity: lineItem.quantity || 1,
            price: lineItem.total_price ? parseFloat(lineItem.total_price) : 0,
            syncedAt: new Date(),
          },
        });
      }
    }
  }
  
  // Always set syncStatus to SUCCESS after a successful sync
  await prisma.syncStatus.updateMany({
    where: { resource: 'sales' },
    data: {
      status: 'SUCCESS',
      errorMessage: null,
      lastSyncedAt: new Date(),
    },
  });
};

const syncUsers = async (req: any) => {
  const persistentToken = await getPersistentLightspeedToken();
  const reqWithToken = {
    ...req,
    session: {
      ...(req?.session || {}),
      lsAccessToken: persistentToken.accessToken,
      lsRefreshToken: persistentToken.refreshToken,
      lsDomainPrefix: process.env.LS_DOMAIN || req?.session?.lsDomainPrefix,
    },
    _forcePersistentToken: true,
  };
  const lightspeedClient = createLightspeedClient(reqWithToken);
  const items = await lightspeedClient.fetchAllWithPagination('/users', {});
  const BATCH_SIZE = 10;
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map((item: any) =>
        prisma.user.upsert({
          where: { id: parseInt(item.id?.toString()) || 0 },
          create: {
            name: item.display_name || item.first_name + ' ' + item.last_name || 'Unknown User',
            email: item.email || null,
            role: mapLightspeedRoleToSuitSync(item.account_type || 'employee'),
            lightspeedEmployeeId: item.id?.toString(),
            photoUrl: item.photo_url || null,
            createdAt: item.created_at ? new Date(item.created_at) : new Date(),
            updatedAt: item.updated_at ? new Date(item.updated_at) : new Date(),
          },
          update: {
            name: item.display_name || item.first_name + ' ' + item.last_name || 'Unknown User',
            email: item.email || null,
            role: mapLightspeedRoleToSuitSync(item.account_type || 'employee'),
            lightspeedEmployeeId: item.id?.toString(),
            photoUrl: item.photo_url || null,
            updatedAt: item.updated_at ? new Date(item.updated_at) : new Date(),
          },
        })
      )
    );
  }
  
  // Always set syncStatus to SUCCESS after a successful sync
  await prisma.syncStatus.updateMany({
    where: { resource: 'users' },
    data: {
      status: 'SUCCESS',
      errorMessage: null,
      lastSyncedAt: new Date(),
    },
  });
};

const syncGroups = async (req: any) => {
  const persistentToken = await getPersistentLightspeedToken();
  const reqWithToken = {
    ...req,
    session: {
      ...(req?.session || {}),
      lsAccessToken: persistentToken.accessToken,
      lsRefreshToken: persistentToken.refreshToken,
      lsDomainPrefix: process.env.LS_DOMAIN || req?.session?.lsDomainPrefix,
    },
    _forcePersistentToken: true,
  };
  const lightspeedClient = createLightspeedClient(reqWithToken);
  const items = await lightspeedClient.fetchAllWithPagination('/customer_groups', {});
  const BATCH_SIZE = 10;
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (item: any) => {
        // Check if party already exists with this lightspeedGroupId
        const existingParty = await prisma.party.findFirst({
          where: { lightspeedGroupId: item.id?.toString() }
        });
        
        if (existingParty) {
          // Update existing party
          await prisma.party.update({
            where: { id: existingParty.id },
            data: {
              name: item.name || 'Unnamed Party',
              notes: item.description || '',
              updatedAt: item.updated_at ? new Date(item.updated_at) : new Date(),
            },
          });
        } else {
          // Create new party
          await prisma.party.create({
            data: {
              name: item.name || 'Unnamed Party',
              eventDate: new Date(), // Default date since groups don't have event dates
              notes: item.description || '',
              lightspeedGroupId: item.id?.toString(),
              customerId: 1, // Default customer ID
              salesPersonId: 1, // Default sales person ID
              createdAt: item.created_at ? new Date(item.created_at) : new Date(),
              updatedAt: item.updated_at ? new Date(item.updated_at) : new Date(),
            },
          });
        }
      })
    );
  }
  
  // Always set syncStatus to SUCCESS after a successful sync
  await prisma.syncStatus.updateMany({
    where: { resource: 'groups' },
    data: {
      status: 'SUCCESS',
      errorMessage: null,
      lastSyncedAt: new Date(),
    },
  });
};

// Helper function to map Lightspeed roles to SuitSync roles
function mapLightspeedRoleToSuitSync(lightspeedAccountType: string): string {
  switch (lightspeedAccountType?.toLowerCase()) {
    case 'admin':
    case 'administrator':
      return 'admin';
    case 'manager':
    case 'supervisor':
      return 'manager';
    case 'employee':
    case 'staff':
    case 'sales':
      return 'employee';
    case 'tailor':
    case 'alterations':
      return 'tailor';
    default:
      return 'employee';
  }
}

export { syncCustomers, syncSales, syncUsers, syncGroups };
