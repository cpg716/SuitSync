import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import logger from '../utils/logger';

const prisma = new PrismaClient().$extends(withAccelerate());

interface QueryPerformanceMetrics {
  query: string;
  duration: number;
  timestamp: Date;
  params?: any;
}

interface DatabaseMetrics {
  connectionCount: number;
  slowQueries: QueryPerformanceMetrics[];
  averageQueryTime: number;
  totalQueries: number;
}

class PerformanceService {
  private queryMetrics: QueryPerformanceMetrics[] = [];
  private readonly SLOW_QUERY_THRESHOLD = 1000; // 1 second
  private readonly MAX_METRICS_HISTORY = 1000;

  // Track query performance
  async trackQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>,
    params?: any
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await queryFn();
      const duration = Date.now() - startTime;
      
      this.recordQueryMetric({
        query: queryName,
        duration,
        timestamp: new Date(),
        params,
      });

      if (duration > this.SLOW_QUERY_THRESHOLD) {
        logger.warn(`Slow query detected: ${queryName} took ${duration}ms`, {
          query: queryName,
          duration,
          params,
        });
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`Query failed: ${queryName} after ${duration}ms`, {
        query: queryName,
        duration,
        params,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  private recordQueryMetric(metric: QueryPerformanceMetrics) {
    this.queryMetrics.push(metric);
    
    // Keep only recent metrics to prevent memory leaks
    if (this.queryMetrics.length > this.MAX_METRICS_HISTORY) {
      this.queryMetrics = this.queryMetrics.slice(-this.MAX_METRICS_HISTORY);
    }
  }

  // Get performance metrics
  getMetrics(): DatabaseMetrics {
    const totalQueries = this.queryMetrics.length;
    const slowQueries = this.queryMetrics.filter(
      m => m.duration > this.SLOW_QUERY_THRESHOLD
    );
    
    const averageQueryTime = totalQueries > 0
      ? this.queryMetrics.reduce((sum, m) => sum + m.duration, 0) / totalQueries
      : 0;

    return {
      connectionCount: 0, // Would need to implement connection pooling metrics
      slowQueries: slowQueries.slice(-10), // Last 10 slow queries
      averageQueryTime,
      totalQueries,
    };
  }

  // Optimized query helpers
  async getCustomersOptimized(filters: {
    search?: string;
    limit?: number;
    offset?: number;
    includeParties?: boolean;
    includeJobs?: boolean;
  }) {
    return this.trackQuery('getCustomersOptimized', async () => {
      const { search, limit = 50, offset = 0, includeParties, includeJobs } = filters;
      
      const where = search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
          { phone: { contains: search, mode: 'insensitive' as const } },
        ],
      } : {};

      const include = {
        ...(includeParties && { 
          parties: {
            select: {
              id: true,
              name: true,
              eventDate: true,
              notes: true,
            },
            orderBy: { eventDate: 'desc' as const },
            take: 5, // Limit related data
          }
        }),
        ...(includeJobs && {
          alterationJobs: {
            select: {
              id: true,
              jobNumber: true,
              status: true,
              dueDate: true,
            },
            orderBy: { createdAt: 'desc' as const },
            take: 5, // Limit related data
          }
        }),
        measurements: {
          select: {
            id: true,
            updatedAt: true,
          }
        },
      };

      return prisma.customer.findMany({
        where,
        include,
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
      });
    }, filters);
  }

  async getAlterationJobsOptimized(filters: {
    status?: string[];
    tailorId?: number;
    customerId?: number;
    partyId?: number;
    limit?: number;
    offset?: number;
    includeParts?: boolean;
  }) {
    return this.trackQuery('getAlterationJobsOptimized', async () => {
      const { 
        status, 
        tailorId, 
        customerId, 
        partyId, 
        limit = 50, 
        offset = 0,
        includeParts 
      } = filters;

      const where: any = {};
      
      if (status?.length) {
        where.status = { in: status };
      }
      if (tailorId) {
        where.tailorId = tailorId;
      }
      if (customerId) {
        where.customerId = customerId;
      }
      if (partyId) {
        where.partyId = partyId;
      }

      const include = {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          }
        },
        party: {
          select: {
            id: true,
            name: true,
            eventDate: true,
          }
        },
        tailor: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        ...(includeParts && {
          jobParts: {
            select: {
              id: true,
              partName: true,
              partType: true,
              status: true,
              assignedTo: true,
              priority: true,
            },
            orderBy: { priority: 'desc' as const },
          }
        }),
      };

      return prisma.alterationJob.findMany({
        where,
        include,
        orderBy: [
          { rushOrder: 'desc' },
          { dueDate: 'asc' },
          { createdAt: 'desc' },
        ],
        take: limit,
        skip: offset,
      });
    }, filters);
  }

  async getAppointmentsOptimized(filters: {
    startDate?: Date;
    endDate?: Date;
    tailorId?: number;
    partyId?: number;
    status?: string[];
    limit?: number;
  }) {
    return this.trackQuery('getAppointmentsOptimized', async () => {
      const { startDate, endDate, tailorId, partyId, status, limit = 100 } = filters;

      const where: any = {};
      
      if (startDate || endDate) {
        where.dateTime = {};
        if (startDate) where.dateTime.gte = startDate;
        if (endDate) where.dateTime.lte = endDate;
      }
      
      if (tailorId) {
        where.tailorId = tailorId;
      }
      
      if (partyId) {
        where.partyId = partyId;
      }
      
      if (status?.length) {
        where.status = { in: status };
      }

      return prisma.appointment.findMany({
        where,
        include: {
          party: {
            select: {
              id: true,
              name: true,
              eventDate: true,
              customer: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                }
              }
            }
          },
          tailor: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          },
        },
        orderBy: { dateTime: 'asc' },
        take: limit,
      });
    }, filters);
  }

  // Database health check
  async checkDatabaseHealth() {
    return this.trackQuery('checkDatabaseHealth', async () => {
      const [
        customerCount,
        jobCount,
        appointmentCount,
        userCount,
      ] = await Promise.all([
        prisma.customer.count(),
        prisma.alterationJob.count(),
        prisma.appointment.count(),
        prisma.user.count(),
      ]);

      return {
        customerCount,
        jobCount,
        appointmentCount,
        userCount,
        timestamp: new Date(),
      };
    });
  }

  // Clear metrics (for testing or memory management)
  clearMetrics() {
    this.queryMetrics = [];
  }
}

export const performanceService = new PerformanceService();
export default performanceService;
