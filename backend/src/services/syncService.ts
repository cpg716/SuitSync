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
type WhereClause<T> = (item: any) => any;

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
async function syncResource<T>(req: any, resourceName: string, endpoint: string, model: PrismaModel<T>, mapper: Mapper<T>, whereClause?: WhereClause<T>) {
  logger.info(`[SyncService] Starting Lightspeed sync for resource: ${resourceName}`);
  // Avoid circular JSON on Express req
  try {
    logger.info(`[SyncService] Incoming req meta`, {
      method: req?.method,
      url: req?.originalUrl || req?.url,
      ip: req?.ip,
      hasSession: !!req?.session,
    });
  } catch {}
  logger.info(`[SyncService] Session access token present: ${req?.session?.lsAccessToken ? 'YES' : 'NO'}`);
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
      // Do not log tokens; log only presence and expiry
      logger.info(`[SyncService] Loaded persistent Lightspeed token (present: YES, expiresAt: ${persistentToken.expiresAt?.toISOString?.() || 'unknown'})`);
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

    // Upsert all items in parallel (with concurrency limit)
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
          
          // Use custom where clause if provided, otherwise use default lightspeedId
          const where = whereClause ? whereClause(item) : { lightspeedId: item.id?.toString() };
          
          const result = await model.upsert({
            where,
            create: mappedData,
            update: mappedData,
          });
          return result;
        } catch (error: any) {
          logger.error(`[SyncService] Error upserting item in ${resourceName}:`, error);
          failedCount++;
          failedItems.push({ item, error: error.message });
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
        lastSyncedVersion: maxVersion,
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
  console.log('[SyncService] Starting customers sync...');
  
  // Use the generic syncResource function for proper sync status handling
  await syncResource(
    req,
    'customers',
    '/customers',
    prisma.customer,
    (item: any) => ({
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
    })
  );
  
  console.log('[SyncService] Customers sync completed');
};

const syncCustomerGroups = async (req: any) => {
  console.log('Starting customer groups sync...');
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

  try {
    const groups = await lightspeedClient.getCustomerGroups();
    const BATCH_SIZE = 10;

    for (let i = 0; i < groups.length; i += BATCH_SIZE) {
      const batch = groups.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (group: any) => {
          // Sync customer group to SuitSync CustomerGroup
          const groupName = group.name || 'Unnamed Group';
          const externalId = group.id?.toString();

          const customerGroup = await prisma.customerGroup.upsert({
            where: {
              name_externalId: {
                name: groupName,
                externalId: externalId
              }
            },
            create: {
              name: groupName,
              externalId: externalId,
            },
            update: {
              name: groupName,
            },
          });

          // Sync group members if available
          if (group.customers && Array.isArray(group.customers)) {
            for (const customerId of group.customers) {
              try {
                const customer = await prisma.customer.findUnique({
                  where: { lightspeedId: customerId.toString() }
                });

                if (customer) {
                  // Connect customer to group
                  await prisma.customerGroup.update({
                    where: { id: customerGroup.id },
                    data: {
                      customers: {
                        connect: { id: customer.id }
                      }
                    }
                  });
                }
              } catch (error) {
                console.warn(`Failed to connect customer ${customerId} to group ${group.id}:`, error);
              }
            }
          }
        })
      );
    }

    // Update sync status
    await prisma.syncStatus.upsert({
      where: { resource: 'customer_groups' },
      update: {
        status: 'SUCCESS',
        errorMessage: null,
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      },
      create: {
        resource: 'customer_groups',
        status: 'SUCCESS',
        errorMessage: null,
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    console.log(`Customer groups sync completed. Processed ${groups.length} groups.`);
  } catch (error: any) {
    console.error('Customer groups sync failed:', error);

    // Update sync status with error
    await prisma.syncStatus.upsert({
      where: { resource: 'customer_groups' },
      update: {
        status: 'ERROR',
        errorMessage: error.message,
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      },
      create: {
        resource: 'customer_groups',
        status: 'ERROR',
        errorMessage: error.message,
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    throw error;
  }
};

const syncSales = async (req: any) => {
  console.log('[SyncService] Starting sales sync...');
  
  // Use the generic syncResource function for proper sync status handling
  await syncResource(
    req,
    'sales',
    '/sales',
    prisma.sale,
    (item: any) => ({
      lightspeedId: item.id?.toString(),
      total: item.total_amount ? parseFloat(item.total_amount) : 0,
      saleDate: item.created_at ? new Date(item.created_at) : new Date(),
      customerId: 1, // Default customer ID - will need to be linked properly
      syncedAt: new Date(),
    })
  );
  
  // Sync sale line items for commission tracking
  try {
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
  } catch (error) {
    console.error('[SyncService] Error syncing sale line items:', error);
    // Don't fail the entire sync for line item errors
  }
  
  console.log('[SyncService] Sales sync completed');
};

const syncUsers = async (req: any) => {
  console.log('[SyncService] Starting users sync...');
  
  // Use the generic syncResource function for proper sync status handling
  await syncResource(
    req,
    'users',
    '/users',
    prisma.user,
    (item: any) => {
      const role = mapLightspeedRoleToSuitSync(item.account_type || 'employee');
      
      // Determine if user can login to SuitSync based on role
      const canLoginToSuitSync = role === 'admin' || role === 'sales' || role === 'manager';
      
      return {
        name: item.display_name || item.first_name + ' ' + item.last_name || 'Unknown User',
        email: item.email || null,
        role: role,
        lightspeedEmployeeId: item.id?.toString(),
        photoUrl: item.photo_url || null,
        canLoginToSuitSync: canLoginToSuitSync,
        isActive: true,
        passwordHash: null, // Will be set by admin if needed
        commissionRate: 0.1, // Default commission rate
        notificationPrefs: null,
        pinHash: null,
        pinSetAt: null,
        pinAttempts: null,
        pinLockedUntil: null,
        lastPinUse: null,
        createdAt: item.created_at ? new Date(item.created_at) : new Date(),
        updatedAt: item.updated_at ? new Date(item.updated_at) : new Date(),
      };
    },
    (item: any) => ({ lightspeedEmployeeId: item.id?.toString() }) // Custom where clause for users
  );
  
  console.log('[SyncService] Users sync completed');
};

const syncGroups = async (req: any) => {
  console.log('[SyncService] Starting groups sync...');
  
  // Use the generic syncResource function for proper sync status handling
  // Note: Groups are synced to the Party model
  await syncResource(
    req,
    'groups',
    '/customer_groups',
    prisma.party,
    (item: any) => ({
      name: item.name || 'Unnamed Party',
      eventDate: new Date(), // Default date since groups don't have event dates
      notes: item.description || '',
      lightspeedGroupId: item.id?.toString(),
      customerId: 1, // Default customer ID
      salesPersonId: 1, // Default sales person ID
      syncedAt: new Date(),
      suitStyle: null,
      suitColor: null,
      externalId: null,
      syncedToLs: false,
      createdAt: item.created_at ? new Date(item.created_at) : new Date(),
      updatedAt: item.updated_at ? new Date(item.updated_at) : new Date(),
    }),
    (item: any) => ({ lightspeedGroupId: item.id?.toString() }) // Custom where clause for groups
  );
  
  console.log('[SyncService] Groups sync completed');
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

export { syncCustomers, syncCustomerGroups, syncSales, syncUsers, syncGroups };
