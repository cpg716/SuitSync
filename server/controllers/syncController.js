const prisma = require('../prismaClient');
const { syncCustomers, syncProducts } = require('../services/syncService');
const logger = require('../utils/logger');

const getSyncStatus = async (req, res) => {
  try {
    const statuses = await prisma.syncStatus.findMany({
      orderBy: { resource: 'asc' },
    });

    // Manually serialize fields to prevent potential crashes from res.json().
    // This ensures BigInts and Dates are always in a safe, stringified format.
    const sanitizedStatuses = statuses.map(s => ({
      ...s,
      lastSyncedVersion: s.lastSyncedVersion?.toString() || null,
      lastSyncedAt: s.lastSyncedAt?.toISOString() || null,
      createdAt: s.createdAt?.toISOString() || null,
      updatedAt: s.updatedAt?.toISOString() || null,
    }));
    
    res.status(200).json(sanitizedStatuses);
  } catch (error) {
    logger.error('Failed to get sync statuses:', { 
      message: error.message,
      stack: error.stack 
    });
    res.status(500).json({ message: 'Failed to retrieve sync statuses.' });
  }
};

const triggerSync = async (req, res) => {
  const { resource } = req.params;
  const { id: userId } = req.user;

  const syncFunctions = {
    customers: syncCustomers,
    products: syncProducts,
  };

  if (!syncFunctions[resource]) {
    return res.status(400).json({ message: `Syncing for resource '${resource}' is not supported.` });
  }

  try {
    // The syncService is now responsible for its own status updates.
    // Kick off the sync process in the background.
    syncFunctions[resource](); 
    
    logger.info(`Manual sync triggered for '${resource}' by user ${userId}`);
    // Immediately respond to the client.
    res.status(202).json({ message: `Synchronization for ${resource} has been initiated.` });
  } catch (error) {
    // This will now only catch errors if the sync function itself fails to start.
    logger.error(`Failed to trigger sync for '${resource}':`, error);
    res.status(500).json({ message: `Failed to start synchronization for ${resource}.` });
  }
};

module.exports = {
  getSyncStatus,
  triggerSync,
}; 