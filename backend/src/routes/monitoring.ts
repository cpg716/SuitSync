import express from 'express';
import { authMiddleware, requireAdmin } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import {
  getSystemMetrics,
  getAlerts,
  getLogs,
  getLogFiles,
  downloadLogFile,
  getHealthCheck,
  clearLogs,
} from '../controllers/monitoringController';

const router = express.Router();

// Health check endpoint (public)
router.get('/health', asyncHandler(getHealthCheck));

// All other monitoring routes require admin access
router.use(authMiddleware);
router.use(requireAdmin);

// System metrics
router.get('/metrics', asyncHandler(getSystemMetrics));

// Alerts
router.get('/alerts', asyncHandler(getAlerts));

// Logs
router.get('/logs', asyncHandler(getLogs));
router.get('/logs/files', asyncHandler(getLogFiles));
router.get('/logs/download/:filename', asyncHandler(downloadLogFile));
router.post('/logs/clear', asyncHandler(clearLogs));

export default router;
