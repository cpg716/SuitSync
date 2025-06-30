import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import logger from '../utils/logger';

const prisma = new PrismaClient().$extends(withAccelerate());

interface AuditLogData {
  userId?: number;
  action: string;
  entity: string;
  entityId?: number;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

class AuditLogger {
  private logQueue: AuditLogData[] = [];
  private isProcessing = false;
  private readonly BATCH_SIZE = 10;
  private readonly FLUSH_INTERVAL = 5000; // 5 seconds

  constructor() {
    // Process logs periodically
    setInterval(() => {
      this.flushLogs();
    }, this.FLUSH_INTERVAL);

    // Graceful shutdown
    process.on('SIGTERM', () => {
      this.flushLogs();
    });
    process.on('SIGINT', () => {
      this.flushLogs();
    });
  }

  async log(data: AuditLogData): Promise<void> {
    this.logQueue.push(data);
    
    if (this.logQueue.length >= this.BATCH_SIZE) {
      await this.flushLogs();
    }
  }

  private async flushLogs(): Promise<void> {
    if (this.isProcessing || this.logQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const logsToProcess = this.logQueue.splice(0, this.BATCH_SIZE);

    try {
      await prisma.auditLog.createMany({
        data: logsToProcess.map(log => ({
          userId: log.userId,
          action: log.action,
          entity: log.entity,
          entityId: log.entityId || 0,
          details: JSON.stringify({
            ...log.details,
            ipAddress: log.ipAddress,
            userAgent: log.userAgent,
            timestamp: log.timestamp.toISOString(),
          }),
          createdAt: log.timestamp,
        })),
        skipDuplicates: true,
      });

      logger.debug(`Flushed ${logsToProcess.length} audit logs to database`);
    } catch (error) {
      logger.error('Failed to flush audit logs:', error);
      // Re-add failed logs to the front of the queue
      this.logQueue.unshift(...logsToProcess);
    } finally {
      this.isProcessing = false;
    }
  }

  async forceFlush(): Promise<void> {
    while (this.logQueue.length > 0) {
      await this.flushLogs();
    }
  }
}

const auditLogger = new AuditLogger();

// Audit logging middleware
export const auditLog = (action: string, entity: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    const originalJson = res.json;
    
    let responseData: any;
    let entityId: number | undefined;

    // Capture response data
    res.send = function(data: any) {
      responseData = data;
      return originalSend.call(this, data);
    };

    res.json = function(data: any) {
      responseData = data;
      return originalJson.call(this, data);
    };

    // Log after response is sent
    res.on('finish', async () => {
      try {
        // Extract entity ID from various sources
        if (req.params.id) {
          entityId = parseInt(req.params.id, 10);
        } else if (responseData && typeof responseData === 'object' && responseData.id) {
          entityId = responseData.id;
        } else if (req.body && req.body.id) {
          entityId = req.body.id;
        }

        const logData: AuditLogData = {
          userId: (req as any).user?.id,
          action,
          entity,
          entityId,
          details: {
            method: req.method,
            path: req.path,
            query: req.query,
            body: sanitizeBody(req.body),
            statusCode: res.statusCode,
            success: res.statusCode < 400,
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date(),
        };

        await auditLogger.log(logData);
      } catch (error) {
        logger.error('Failed to create audit log:', error);
      }
    });

    next();
  };
};

// Sanitize sensitive data from request body
function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sensitiveFields = [
    'password',
    'passwordHash',
    'token',
    'accessToken',
    'refreshToken',
    'secret',
    'apiKey',
    'creditCard',
    'ssn',
    'socialSecurityNumber',
  ];

  const sanitized = { ...body };

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

// Specific audit middleware for different actions
export const auditMiddleware = {
  create: (entity: string) => auditLog('create', entity),
  read: (entity: string) => auditLog('read', entity),
  update: (entity: string) => auditLog('update', entity),
  delete: (entity: string) => auditLog('delete', entity),
  sync: (entity: string) => auditLog('sync', entity),
  login: () => auditLog('login', 'user'),
  logout: () => auditLog('logout', 'user'),
  export: (entity: string) => auditLog('export', entity),
  import: (entity: string) => auditLog('import', entity),
};

// Manual audit logging function
export const logAuditEvent = async (
  userId: number | undefined,
  action: string,
  entity: string,
  entityId: number | undefined,
  details: Record<string, any>,
  req?: Request
): Promise<void> => {
  const logData: AuditLogData = {
    userId,
    action,
    entity,
    entityId,
    details,
    ipAddress: req?.ip,
    userAgent: req?.get('User-Agent'),
    timestamp: new Date(),
  };

  await auditLogger.log(logData);
};

// Get audit logs with filtering
export const getAuditLogs = async (filters: {
  userId?: number;
  entity?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) => {
  const {
    userId,
    entity,
    action,
    startDate,
    endDate,
    limit = 100,
    offset = 0,
  } = filters;

  const where: any = {};

  if (userId) where.userId = userId;
  if (entity) where.entity = entity;
  if (action) where.action = action;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  return prisma.auditLog.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
};

// Export the audit logger instance for manual flushing
export { auditLogger };
