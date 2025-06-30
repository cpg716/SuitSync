import { Request, Response } from 'express';
import performanceService from '../services/performanceService';
import { cacheService } from '../services/cacheService';
import logger from '../utils/logger';

export const getPerformanceMetrics = async (req: Request, res: Response): Promise<void> => {
  try {
    const dbMetrics = performanceService.getMetrics();
    const cacheStats = cacheService.getStats();
    const cacheHitRatio = cacheService.getHitRatio();
    
    const dbHealth = await performanceService.checkDatabaseHealth();
    
    const metrics = {
      database: {
        ...dbMetrics,
        health: dbHealth,
      },
      cache: {
        ...cacheStats,
        hitRatio: cacheHitRatio,
      },
      memory: {
        used: process.memoryUsage().heapUsed,
        total: process.memoryUsage().heapTotal,
        external: process.memoryUsage().external,
        rss: process.memoryUsage().rss,
      },
      uptime: process.uptime(),
      timestamp: new Date(),
    };

    res.json(metrics);
  } catch (error) {
    logger.error('Failed to get performance metrics:', error);
    res.status(500).json({ error: 'Failed to get performance metrics' });
  }
};

export const clearCache = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pattern } = req.body;
    
    if (pattern) {
      const invalidated = cacheService.invalidatePattern(pattern);
      res.json({ 
        message: `Invalidated ${invalidated} cache entries matching pattern: ${pattern}` 
      });
    } else {
      cacheService.clear();
      res.json({ message: 'Cache cleared successfully' });
    }
  } catch (error) {
    logger.error('Failed to clear cache:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
};

export const getCacheStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = cacheService.getStats();
    const hitRatio = cacheService.getHitRatio();
    
    res.json({
      ...stats,
      hitRatio,
      hitRatioPercentage: Math.round(hitRatio * 100),
    });
  } catch (error) {
    logger.error('Failed to get cache stats:', error);
    res.status(500).json({ error: 'Failed to get cache stats' });
  }
};

export const getSlowQueries = async (req: Request, res: Response): Promise<void> => {
  try {
    const metrics = performanceService.getMetrics();
    
    res.json({
      slowQueries: metrics.slowQueries,
      averageQueryTime: metrics.averageQueryTime,
      totalQueries: metrics.totalQueries,
    });
  } catch (error) {
    logger.error('Failed to get slow queries:', error);
    res.status(500).json({ error: 'Failed to get slow queries' });
  }
};

export const preloadCache = async (req: Request, res: Response): Promise<void> => {
  try {
    // Define common cache preloaders
    const loaders = [
      {
        key: 'users:all',
        loader: () => performanceService.trackQuery('preload_users', async () => {
          const { PrismaClient } = await import('@prisma/client');
          const { withAccelerate } = await import('@prisma/extension-accelerate');
          const prisma = new PrismaClient().$extends(withAccelerate());
          
          return prisma.user.findMany({
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          });
        }),
        ttl: 30 * 60 * 1000, // 30 minutes
      },
      {
        key: 'stats:dashboard',
        loader: () => performanceService.trackQuery('preload_dashboard_stats', async () => {
          const { PrismaClient } = await import('@prisma/client');
          const { withAccelerate } = await import('@prisma/extension-accelerate');
          const prisma = new PrismaClient().$extends(withAccelerate());
          
          const [
            totalCustomers,
            totalJobs,
            pendingJobs,
            overdueJobs,
          ] = await Promise.all([
            prisma.customer.count(),
            prisma.alterationJob.count(),
            prisma.alterationJob.count({ where: { status: 'NOT_STARTED' } }),
            prisma.alterationJob.count({
              where: {
                dueDate: { lt: new Date() },
                status: { notIn: ['COMPLETE', 'PICKED_UP'] },
              },
            }),
          ]);
          
          return {
            totalCustomers,
            totalJobs,
            pendingJobs,
            overdueJobs,
          };
        }),
        ttl: 5 * 60 * 1000, // 5 minutes
      },
    ];

    await cacheService.preload(loaders);
    
    res.json({ 
      message: `Preloaded ${loaders.length} cache entries`,
      keys: loaders.map(l => l.key),
    });
  } catch (error) {
    logger.error('Failed to preload cache:', error);
    res.status(500).json({ error: 'Failed to preload cache' });
  }
};

export const getSystemHealth = async (req: Request, res: Response): Promise<void> => {
  try {
    const dbHealth = await performanceService.checkDatabaseHealth();
    const cacheStats = cacheService.getStats();
    const memoryUsage = process.memoryUsage();
    
    // Calculate health scores
    const cacheHitRatio = cacheService.getHitRatio();
    const memoryUsageRatio = memoryUsage.heapUsed / memoryUsage.heapTotal;
    
    const health = {
      status: 'healthy',
      database: {
        status: 'connected',
        ...dbHealth,
      },
      cache: {
        status: cacheHitRatio > 0.7 ? 'optimal' : cacheHitRatio > 0.5 ? 'good' : 'poor',
        hitRatio: cacheHitRatio,
        ...cacheStats,
      },
      memory: {
        status: memoryUsageRatio < 0.8 ? 'good' : memoryUsageRatio < 0.9 ? 'warning' : 'critical',
        usageRatio: memoryUsageRatio,
        ...memoryUsage,
      },
      uptime: process.uptime(),
      timestamp: new Date(),
    };

    // Determine overall status
    if (memoryUsageRatio > 0.9 || cacheHitRatio < 0.3) {
      health.status = 'warning';
    }

    res.json(health);
  } catch (error) {
    logger.error('Failed to get system health:', error);
    res.status(500).json({ 
      status: 'error',
      error: 'Failed to get system health',
      timestamp: new Date(),
    });
  }
};
