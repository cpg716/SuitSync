import express from 'express';
import { authMiddleware, requireAdmin } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import {
  getPerformanceMetrics,
  clearCache,
  getCacheStats,
  getSlowQueries,
  preloadCache,
  getSystemHealth,
} from '../controllers/performanceController';

const router = express.Router();

// All performance routes require admin access
router.use(authMiddleware);
router.use(requireAdmin);

// Get comprehensive performance metrics
router.get('/metrics', asyncHandler(getPerformanceMetrics));

// Get system health status
router.get('/health', asyncHandler(getSystemHealth));

// Cache management
router.get('/cache/stats', asyncHandler(getCacheStats));
router.post('/cache/clear', asyncHandler(clearCache));
router.post('/cache/preload', asyncHandler(preloadCache));

// Query performance
router.get('/queries/slow', asyncHandler(getSlowQueries));

export default router;
