import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import { getInstallationInfo, isServerInstallation } from '../utils/config';
import clientServerService from '../services/clientServerService';
import logger from '../utils/logger';

const prisma = new PrismaClient().$extends(withAccelerate());

// Get installation information
export const getInstallationInfoController = async (req: Request, res: Response) => {
  try {
    const info = getInstallationInfo();
    res.json({
      success: true,
      data: info,
    });
  } catch (error) {
    logger.error('Failed to get installation info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get installation information',
    });
  }
};

// Get server connection status (for client installations)
export const getServerStatus = async (req: Request, res: Response) => {
  try {
    if (isServerInstallation()) {
      return res.json({
        success: true,
        data: {
          isServer: true,
          status: 'healthy',
          message: 'This is a server installation',
        },
      });
    }

    const isConnected = await clientServerService.isServerAvailable();
    const clientInfo = clientServerService.getClientInfo();
    const serverStatus = await clientServerService.getServerStatus();

    res.json({
      success: true,
      data: {
        isServer: false,
        isConnected,
        clientInfo,
        serverStatus,
      },
    });
  } catch (error) {
    logger.error('Failed to get server status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get server status',
    });
  }
};

// Handle client data synchronization
export const handleClientSync = async (req: Request, res: Response) => {
  try {
    if (isServerInstallation()) {
      return res.status(400).json({
        success: false,
        error: 'This endpoint is only for client installations',
      });
    }

    const { resource, lastSyncTimestamp, data } = req.body;

    if (!resource) {
      return res.status(400).json({
        success: false,
        error: 'Resource is required',
      });
    }

    // Sync data with server
    const syncResult = await clientServerService.syncData(resource, lastSyncTimestamp);

    if (!syncResult) {
      return res.status(503).json({
        success: false,
        error: 'Server is not available',
      });
    }

    res.json({
      success: true,
      data: syncResult,
    });
  } catch (error) {
    logger.error('Failed to handle client sync:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync with server',
    });
  }
};

// Send data to server (for client installations)
export const sendDataToServer = async (req: Request, res: Response) => {
  try {
    if (isServerInstallation()) {
      return res.status(400).json({
        success: false,
        error: 'This endpoint is only for client installations',
      });
    }

    const { endpoint, data } = req.body;

    if (!endpoint || !data) {
      return res.status(400).json({
        success: false,
        error: 'Endpoint and data are required',
      });
    }

    const success = await clientServerService.sendDataToServer(endpoint, data);

    if (!success) {
      return res.status(503).json({
        success: false,
        error: 'Failed to send data to server',
      });
    }

    res.json({
      success: true,
      message: 'Data sent to server successfully',
    });
  } catch (error) {
    logger.error('Failed to send data to server:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send data to server',
    });
  }
};

// Get local data (for client installations)
export const getLocalData = async (req: Request, res: Response) => {
  try {
    if (isServerInstallation()) {
      return res.status(400).json({
        success: false,
        error: 'This endpoint is only for client installations',
      });
    }

    const { resource } = req.params;
    const { limit = 100, offset = 0 } = req.query;

    // Get data from local database based on resource type
    let data;
    switch (resource) {
      case 'customers':
        data = await prisma.customer.findMany({
          take: Number(limit),
          skip: Number(offset),
          orderBy: { updatedAt: 'desc' },
        });
        break;
      case 'parties':
        data = await prisma.party.findMany({
          take: Number(limit),
          skip: Number(offset),
          orderBy: { updatedAt: 'desc' },
          include: {
            members: true,
            appointments: true,
            alterationJobs: true,
          },
        });
        break;
      case 'appointments':
        data = await prisma.appointment.findMany({
          take: Number(limit),
          skip: Number(offset),
          orderBy: { createdAt: 'desc' },
          include: {
            party: true,
            member: true,
          },
        });
        break;
      case 'alterations':
        data = await prisma.alterationJob.findMany({
          take: Number(limit),
          skip: Number(offset),
          orderBy: { updatedAt: 'desc' },
          include: {
            party: true,
            partyMember: true,
            tailor: true,
          },
        });
        break;
      default:
        return res.status(400).json({
          success: false,
          error: `Unknown resource: ${resource}`,
        });
    }

    res.json({
      success: true,
      data,
      count: data.length,
    });
  } catch (error) {
    logger.error(`Failed to get local ${req.params.resource} data:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to get local data',
    });
  }
};

// Test server connection
export const testServerConnection = async (req: Request, res: Response) => {
  try {
    if (isServerInstallation()) {
      return res.json({
        success: true,
        data: {
          isServer: true,
          message: 'This is a server installation',
        },
      });
    }

    const isConnected = await clientServerService.testConnection();
    const clientInfo = clientServerService.getClientInfo();

    res.json({
      success: true,
      data: {
        isConnected,
        clientInfo,
        message: isConnected ? 'Successfully connected to server' : 'Failed to connect to server',
      },
    });
  } catch (error) {
    logger.error('Failed to test server connection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test server connection',
    });
  }
}; 