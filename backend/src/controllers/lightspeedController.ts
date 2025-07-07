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
    const expectedResources = ['customers', 'users', 'products', 'sales'];
    const statuses = await prisma.syncStatus.findMany({ orderBy: { resource: 'asc' } });
    const statusMap = new Map(statuses.map(s => [s.resource, s]));
    const now = new Date();
    const sanitizedStatuses = expectedResources.map(resource => {
      const s = statusMap.get(resource);
      return {
        resource,
        status: s?.status || 'IDLE',
        lastSyncedVersion: s?.lastSyncedVersion?.toString() || null,
        lastSyncedAt: s?.lastSyncedAt?.toISOString() || null,
        createdAt: s?.createdAt?.toISOString() || null,
        updatedAt: s?.updatedAt?.toISOString() || null,
        errorMessage: s?.errorMessage || null,
      };
    });
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

// Debug: List all Lightspeed users for current session token or provided token
export const debugListLightspeedUsers = async (req: Request, res: Response) => {
  try {
    // Allow token via query param or header for unauthenticated debug
    const token = req.query.token || req.headers['x-ls-access-token'] || req.session?.lsAccessToken;
    const domain = req.query.domain || req.headers['x-ls-domain'] || req.session?.lsDomainPrefix || process.env.LS_DOMAIN;
    if (!token || !domain) {
      return res.status(400).json({ error: 'Missing access token or domain. Provide ?token= and ?domain= or use session.' });
    }
    const axios = require('axios');
    const url = `https://${domain}.retail.lightspeed.app/api/2.0/users`;
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.json(response.data);
  } catch (err) {
    const status = (typeof err === 'object' && err && 'response' in err && (err as any).response?.status) ? (err as any).response.status : 500;
    const data = (typeof err === 'object' && err && 'response' in err && (err as any).response?.data) ? (err as any).response.data : (err as any)?.message || String(err);
    return res.status(status).json({ error: 'Failed to fetch users', details: data });
  }
}; 