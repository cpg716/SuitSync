const prisma = require('../prismaClient');
const { createLightspeedClient } = require('../lightspeedClient');
const logger = require('../utils/logger');

const getLightspeedHealth = async (req, res) => {
    // Use a system-level client that relies on the stored persistent token.
    const lightspeedClient = createLightspeedClient(null); 
    let lightspeedConnection = 'OK';
    let lightspeedApiError = null;

    try {
        // A simple, low-cost API call to verify connectivity and authentication.
        // The /retailer endpoint fetches basic info about the account.
        const retailerResponse = await lightspeedClient.get('/retailer');
        logger.info('[Lightspeed Health] API connectivity check successful.', {
            retailer: retailerResponse.data?.data?.name || 'Unknown',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        lightspeedConnection = 'ERROR';
        lightspeedApiError = error.response?.data?.message || error.message || 'An unknown API error occurred.';
        logger.error(`[Lightspeed Health] API connectivity check failed: ${lightspeedApiError}`, {
            status: error.response?.status,
            timestamp: new Date().toISOString()
        });
    }

    try {
        const statuses = await prisma.syncStatus.findMany({
            orderBy: { resource: 'asc' },
        });

        // Manually serialize to prevent any potential crashes in res.json().
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

    } catch (dbError) {
        logger.error('[Lightspeed Health] Failed to get sync statuses from DB:', {
            message: dbError.message,
            stack: dbError.stack,
        });

        // Still return a 500, but include the results of the API check.
        res.status(500).json({
            lightspeedConnection,
            lightspeedApiError,
            syncStatuses: [],
            databaseError: 'Failed to retrieve sync statuses from the database.'
        });
    }
};

// Delete all sessions for a given Lightspeed user (admin/system-level)
const deleteLightspeedUserSessions = async (req, res) => {
  const { userId } = req.params;
  try {
    const lightspeedClient = createLightspeedClient(null);
    await lightspeedClient.delete(`/users/${userId}/sessions`);
    logger.info(`[Lightspeed] Deleted all sessions for user ${userId}`);
    res.status(204).send();
  } catch (error) {
    logger.error(`[Lightspeed] Failed to delete sessions for user ${userId}:`, error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to delete user sessions', details: error.response?.data || error.message });
  }
};

module.exports = {
    getLightspeedHealth,
    deleteLightspeedUserSessions,
}; 