import { Request, Response } from 'express';
import metricsService from '../services/metricsService';
import logger from '../utils/logger';
import { readdir, readFile, stat } from 'fs/promises';
import { join } from 'path';

export const getSystemMetrics = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentMetrics = metricsService.getCurrentMetrics();
    const hours = parseInt((req.query.hours as string) || '1', 10);
    const history = metricsService.getMetricsHistory(hours);

    res.json({
      current: currentMetrics,
      history,
      summary: {
        totalDataPoints: history.length,
        timeRange: `${hours} hour(s)`,
        averageMemoryUsage: history.length > 0 
          ? history.reduce((sum, m) => sum + m.memory.usagePercentage, 0) / history.length 
          : 0,
        averageResponseTime: history.length > 0
          ? history.reduce((sum, m) => sum + m.api.averageResponseTime, 0) / history.length
          : 0,
      },
    });
  } catch (error) {
    logger.error('Failed to get system metrics', { error });
    res.status(500).json({ error: 'Failed to get system metrics' });
  }
};

export const getAlerts = async (req: Request, res: Response): Promise<void> => {
  try {
    const alerts = metricsService.getAlertHistory();
    
    res.json({
      alerts,
      summary: {
        totalRules: alerts.length,
        activeAlerts: alerts.filter(a => a.lastTriggered && 
          Date.now() - a.lastTriggered.getTime() < 60 * 60 * 1000 // Last hour
        ).length,
      },
    });
  } catch (error) {
    logger.error('Failed to get alerts', { error });
    res.status(500).json({ error: 'Failed to get alerts' });
  }
};

export const getLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      level = 'all',
      hours = '1',
      limit = '100',
      search
    } = req.query as {
      level?: string;
      hours?: string;
      limit?: string;
      search?: string;
    };

    const logsDir = join(process.cwd(), 'logs');
    const logFiles = await readdir(logsDir);
    
    // Get recent log files
    const today = new Date().toISOString().split('T')[0];
    const relevantFiles = logFiles.filter(file => 
      file.includes(today) && 
      (level === 'all' || file.includes(level))
    );

    const logs: any[] = [];
    const cutoffTime = Date.now() - parseInt(hours) * 60 * 60 * 1000;

    for (const file of relevantFiles) {
      try {
        const filePath = join(logsDir, file);
        const content = await readFile(filePath, 'utf-8');
        const lines = content.trim().split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const logEntry = JSON.parse(line);
            const logTime = new Date(logEntry.timestamp).getTime();
            
            if (logTime >= cutoffTime) {
              // Apply search filter if provided
              if (!search || 
                  logEntry.message.toLowerCase().includes(search.toLowerCase()) ||
                  JSON.stringify(logEntry.meta || {}).toLowerCase().includes(search.toLowerCase())
              ) {
                logs.push(logEntry);
              }
            }
          } catch (parseError) {
            // Skip invalid JSON lines
          }
        }
      } catch (fileError) {
        logger.warn(`Failed to read log file: ${file}`, { error: fileError });
      }
    }

    // Sort by timestamp (newest first) and limit
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const limitedLogs = logs.slice(0, parseInt(limit, 10));

    res.json({
      logs: limitedLogs,
      summary: {
        totalLogs: logs.length,
        returned: limitedLogs.length,
        timeRange: `${hours} hour(s)`,
        levels: [...new Set(logs.map(log => log.level))],
      },
    });
  } catch (error) {
    logger.error('Failed to get logs', { error });
    res.status(500).json({ error: 'Failed to get logs' });
  }
};

export const getLogFiles = async (req: Request, res: Response): Promise<void> => {
  try {
    const logsDir = join(process.cwd(), 'logs');
    const files = await readdir(logsDir);
    
    const fileStats = await Promise.all(
      files.map(async (file) => {
        const filePath = join(logsDir, file);
        const stats = await stat(filePath);
        return {
          name: file,
          size: stats.size,
          modified: stats.mtime,
          created: stats.birthtime,
        };
      })
    );

    // Sort by modification time (newest first)
    fileStats.sort((a, b) => b.modified.getTime() - a.modified.getTime());

    res.json({
      files: fileStats,
      summary: {
        totalFiles: fileStats.length,
        totalSize: fileStats.reduce((sum, file) => sum + file.size, 0),
      },
    });
  } catch (error) {
    logger.error('Failed to get log files', { error });
    res.status(500).json({ error: 'Failed to get log files' });
  }
};

export const downloadLogFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { filename } = req.params;
    
    // Validate filename to prevent directory traversal
    if (!filename || filename.includes('..') || filename.includes('/')) {
      res.status(400).json({ error: 'Invalid filename' });
      return;
    }

    const logsDir = join(process.cwd(), 'logs');
    const filePath = join(logsDir, filename);
    
    try {
      const stats = await stat(filePath);
      if (!stats.isFile()) {
        res.status(404).json({ error: 'File not found' });
        return;
      }
    } catch (statError) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    const content = await readFile(filePath);
    res.send(content);
  } catch (error) {
    logger.error('Failed to download log file', { error, filename: req.params.filename });
    res.status(500).json({ error: 'Failed to download log file' });
  }
};

export const getHealthCheck = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentMetrics = metricsService.getCurrentMetrics();
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    
    // Determine health status
    let status = 'healthy';
    const issues: string[] = [];
    
    if (currentMetrics) {
      if (currentMetrics.memory.usagePercentage > 90) {
        status = 'unhealthy';
        issues.push('High memory usage');
      } else if (currentMetrics.memory.usagePercentage > 80) {
        status = 'degraded';
        issues.push('Elevated memory usage');
      }
      
      if (currentMetrics.api.errorRate > 0.1) {
        status = 'unhealthy';
        issues.push('High error rate');
      } else if (currentMetrics.api.errorRate > 0.05) {
        status = 'degraded';
        issues.push('Elevated error rate');
      }
      
      if (currentMetrics.api.averageResponseTime > 2000) {
        status = 'degraded';
        issues.push('Slow response times');
      }
    }

    const healthData = {
      status,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(uptime),
      issues,
      metrics: currentMetrics ? {
        memory: {
          usage: `${Math.round(currentMetrics.memory.usagePercentage)}%`,
          used: `${Math.round(currentMetrics.memory.used / 1024 / 1024)}MB`,
          total: `${Math.round(currentMetrics.memory.total / 1024 / 1024)}MB`,
        },
        api: {
          requestsPerMinute: currentMetrics.api.requestsPerMinute,
          averageResponseTime: `${Math.round(currentMetrics.api.averageResponseTime)}ms`,
          errorRate: `${Math.round(currentMetrics.api.errorRate * 100)}%`,
        },
        cache: {
          hitRate: `${Math.round(currentMetrics.cache.hitRate * 100)}%`,
          size: currentMetrics.cache.size,
        },
      } : null,
      version: process.env.npm_package_version || 'unknown',
      environment: process.env.NODE_ENV || 'unknown',
    };

    // Set appropriate HTTP status code
    const statusCode = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503;
    res.status(statusCode).json(healthData);
  } catch (error) {
    logger.error('Failed to get health check', { error });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    });
  }
};

export const clearLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { olderThan } = req.body; // days
    const days = parseInt(olderThan || '7', 10);
    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;
    
    const logsDir = join(process.cwd(), 'logs');
    const files = await readdir(logsDir);
    
    let deletedCount = 0;
    let deletedSize = 0;
    
    for (const file of files) {
      const filePath = join(logsDir, file);
      const stats = await stat(filePath);
      
      if (stats.mtime.getTime() < cutoffTime) {
        try {
          await require('fs/promises').unlink(filePath);
          deletedCount++;
          deletedSize += stats.size;
        } catch (deleteError) {
          logger.warn(`Failed to delete log file: ${file}`, { error: deleteError });
        }
      }
    }
    
    logger.info('Log cleanup completed', {
      deletedFiles: deletedCount,
      deletedSize: `${Math.round(deletedSize / 1024 / 1024)}MB`,
      olderThanDays: days,
    });
    
    res.json({
      message: 'Log cleanup completed',
      deletedFiles: deletedCount,
      deletedSize: `${Math.round(deletedSize / 1024 / 1024)}MB`,
    });
  } catch (error) {
    logger.error('Failed to clear logs', { error });
    res.status(500).json({ error: 'Failed to clear logs' });
  }
};
