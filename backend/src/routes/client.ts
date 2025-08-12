import { Router } from 'express';
import {
  getInstallationInfoController,
  getServerStatus,
  handleClientSync,
  sendDataToServer,
  getLocalData,
  testServerConnection,
} from '../controllers/clientController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Installation information (no auth required)
router.get('/installation-info', getInstallationInfoController);

// Server connection status (no auth required)
router.get('/server-status', getServerStatus);

// Test server connection (no auth required)
router.post('/test-connection', testServerConnection);

// Client data synchronization (requires auth)
router.post('/sync', authMiddleware, handleClientSync);

// Send data to server (requires auth)
router.post('/send-data', authMiddleware, sendDataToServer);

// Get local data (requires auth)
router.get('/local-data/:resource', authMiddleware, getLocalData);

export default router; 