import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import logger from '../utils/logger';

const prisma = new PrismaClient().$extends(withAccelerate());

interface SystemMetrics {
  timestamp: Date;
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  memory: {
    used: number;
    total: number;
    free: number;
    usagePercentage: number;
  };
  database: {
    connectionCount: number;
    activeQueries: number;
    slowQueries: number;
  };
  api: {
    requestsPerMinute: number;
    averageResponseTime: number;
    errorRate: number;
  };
  cache: {
    hitRate: number;
    size: number;
    evictions: number;
  };
}

interface AlertRule {
  id: string;
  name: string;
  condition: (metrics: SystemMetrics) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  cooldown: number; // minutes
  lastTriggered?: Date;
}

class MetricsService {
  private metrics: SystemMetrics[] = [];
  private readonly MAX_METRICS_HISTORY = 1440; // 24 hours of minute-by-minute data
  private requestCounts: Map<string, number> = new Map(); // minute -> count
  private responseTimes: number[] = [];
  private errorCounts: Map<string, number> = new Map();
  private alertRules: AlertRule[] = [];
  private alertCooldowns: Map<string, Date> = new Map();

  constructor() {
    this.setupDefaultAlertRules();
    this.startMetricsCollection();
  }

  private setupDefaultAlertRules() {
    this.alertRules = [
      {
        id: 'high-memory-usage',
        name: 'High Memory Usage',
        condition: (metrics) => metrics.memory.usagePercentage > 85,
        severity: 'high',
        cooldown: 15,
      },
      {
        id: 'critical-memory-usage',
        name: 'Critical Memory Usage',
        condition: (metrics) => metrics.memory.usagePercentage > 95,
        severity: 'critical',
        cooldown: 5,
      },
      {
        id: 'high-error-rate',
        name: 'High Error Rate',
        condition: (metrics) => metrics.api.errorRate > 0.1, // 10%
        severity: 'high',
        cooldown: 10,
      },
      {
        id: 'slow-response-time',
        name: 'Slow Response Time',
        condition: (metrics) => metrics.api.averageResponseTime > 2000, // 2 seconds
        severity: 'medium',
        cooldown: 15,
      },
      {
        id: 'low-cache-hit-rate',
        name: 'Low Cache Hit Rate',
        condition: (metrics) => metrics.cache.hitRate < 0.5, // 50%
        severity: 'medium',
        cooldown: 30,
      },
    ];
  }

  private startMetricsCollection() {
    // Collect metrics every minute
    setInterval(() => {
      this.collectMetrics();
    }, 60 * 1000);

    // Clean old metrics every hour
    setInterval(() => {
      this.cleanOldMetrics();
    }, 60 * 60 * 1000);

    // Reset counters every minute
    setInterval(() => {
      this.resetCounters();
    }, 60 * 1000);
  }

  private async collectMetrics() {
    try {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      // Get database metrics
      const dbMetrics = await this.getDatabaseMetrics();
      
      // Calculate API metrics
      const apiMetrics = this.getApiMetrics();
      
      // Get cache metrics (would need to integrate with cache service)
      const cacheMetrics = this.getCacheMetrics();

      const metrics: SystemMetrics = {
        timestamp: new Date(),
        cpu: {
          usage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
          loadAverage: process.platform === 'linux' ? require('os').loadavg() : [0, 0, 0],
        },
        memory: {
          used: memoryUsage.heapUsed,
          total: memoryUsage.heapTotal,
          free: memoryUsage.heapTotal - memoryUsage.heapUsed,
          usagePercentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
        },
        database: dbMetrics,
        api: apiMetrics,
        cache: cacheMetrics,
      };

      this.metrics.push(metrics);
      this.checkAlerts(metrics);

      logger.debug('Metrics collected', {
        memoryUsage: `${Math.round(metrics.memory.usagePercentage)}%`,
        apiRequests: metrics.api.requestsPerMinute,
        errorRate: `${Math.round(metrics.api.errorRate * 100)}%`,
      });
    } catch (error) {
      logger.error('Failed to collect metrics', { error });
    }
  }

  private async getDatabaseMetrics() {
    try {
      // This would need to be implemented based on your database monitoring setup
      // For now, return mock data
      return {
        connectionCount: 5,
        activeQueries: 2,
        slowQueries: 0,
      };
    } catch (error) {
      logger.error('Failed to get database metrics', { error });
      return {
        connectionCount: 0,
        activeQueries: 0,
        slowQueries: 0,
      };
    }
  }

  private getApiMetrics() {
    const currentMinute = new Date().toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
    const requestsPerMinute = this.requestCounts.get(currentMinute) || 0;
    
    const averageResponseTime = this.responseTimes.length > 0
      ? this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length
      : 0;
    
    const totalRequests = Array.from(this.requestCounts.values()).reduce((sum, count) => sum + count, 0);
    const totalErrors = Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0);
    const errorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;

    return {
      requestsPerMinute,
      averageResponseTime,
      errorRate,
    };
  }

  private getCacheMetrics() {
    // This would integrate with your cache service
    // For now, return mock data
    return {
      hitRate: 0.8,
      size: 1000,
      evictions: 5,
    };
  }

  private checkAlerts(metrics: SystemMetrics) {
    for (const rule of this.alertRules) {
      const lastTriggered = this.alertCooldowns.get(rule.id);
      const now = new Date();
      
      // Check cooldown
      if (lastTriggered) {
        const cooldownExpired = now.getTime() - lastTriggered.getTime() > rule.cooldown * 60 * 1000;
        if (!cooldownExpired) {
          continue;
        }
      }

      // Check condition
      if (rule.condition(metrics)) {
        this.triggerAlert(rule, metrics);
        this.alertCooldowns.set(rule.id, now);
      }
    }
  }

  private triggerAlert(rule: AlertRule, metrics: SystemMetrics) {
    const alert = {
      id: rule.id,
      name: rule.name,
      severity: rule.severity,
      timestamp: new Date(),
      metrics: {
        memory: metrics.memory.usagePercentage,
        errorRate: metrics.api.errorRate,
        responseTime: metrics.api.averageResponseTime,
        cacheHitRate: metrics.cache.hitRate,
      },
    };

    logger.warn(`Alert triggered: ${rule.name}`, alert);

    // Here you would integrate with your alerting system
    // (email, Slack, PagerDuty, etc.)
    this.sendAlert(alert);
  }

  private async sendAlert(alert: any) {
    // Implement your alerting logic here
    // For now, just log to console and database
    try {
      // You could store alerts in database
      // await prisma.alert.create({ data: alert });
      
      // Send to external services
      if (process.env.SLACK_WEBHOOK_URL) {
        // Send to Slack
        await this.sendSlackAlert(alert);
      }
      
      if (process.env.EMAIL_ALERTS_ENABLED === 'true') {
        // Send email alert
        await this.sendEmailAlert(alert);
      }
    } catch (error) {
      logger.error('Failed to send alert', { error, alert });
    }
  }

  private async sendSlackAlert(alert: any) {
    // Implement Slack webhook integration
    logger.info('Would send Slack alert', alert);
  }

  private async sendEmailAlert(alert: any) {
    // Implement email alert integration
    logger.info('Would send email alert', alert);
  }

  private cleanOldMetrics() {
    if (this.metrics.length > this.MAX_METRICS_HISTORY) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS_HISTORY);
    }
  }

  private resetCounters() {
    // Keep only last hour of request counts
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const currentMinute = oneHourAgo.toISOString().slice(0, 16);
    
    for (const [minute] of this.requestCounts) {
      if (minute < currentMinute) {
        this.requestCounts.delete(minute);
        this.errorCounts.delete(minute);
      }
    }

    // Reset response times array
    this.responseTimes = [];
  }

  // Public methods for recording metrics
  recordRequest(responseTime: number, isError: boolean = false) {
    const currentMinute = new Date().toISOString().slice(0, 16);
    
    // Increment request count
    const currentCount = this.requestCounts.get(currentMinute) || 0;
    this.requestCounts.set(currentMinute, currentCount + 1);
    
    // Record response time
    this.responseTimes.push(responseTime);
    
    // Record error if applicable
    if (isError) {
      const currentErrors = this.errorCounts.get(currentMinute) || 0;
      this.errorCounts.set(currentMinute, currentErrors + 1);
    }
  }

  // Get current metrics
  getCurrentMetrics(): SystemMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  // Get metrics history
  getMetricsHistory(hours: number = 24): SystemMetrics[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.metrics.filter(m => m.timestamp >= cutoff);
  }

  // Get alert history
  getAlertHistory(): AlertRule[] {
    return this.alertRules.map(rule => ({
      ...rule,
      lastTriggered: this.alertCooldowns.get(rule.id),
    }));
  }
}

export const metricsService = new MetricsService();
export default metricsService;
