import cron from 'node-cron';
import type { ScheduledTask } from 'node-cron';
import logger from '../utils/logger';
import { processPendingNotifications } from './notificationSchedulingService';

export class ScheduledJobService {
  private static instance: ScheduledJobService;
  private jobs: Map<string, ScheduledTask> = new Map();

  private constructor() {}

  public static getInstance(): ScheduledJobService {
    if (!ScheduledJobService.instance) {
      ScheduledJobService.instance = new ScheduledJobService();
    }
    return ScheduledJobService.instance;
  }

  /**
   * Initialize all scheduled jobs
   */
  public initialize(): void {
    logger.info('Initializing scheduled jobs...');

    // Process notifications every 5 minutes
    this.scheduleJob('process-notifications', '*/5 * * * *', async () => {
      try {
        await processPendingNotifications();
      } catch (error) {
        logger.error('Error in scheduled notification processing:', error);
      }
    });

    // Clean up old notifications daily at 2 AM
    this.scheduleJob('cleanup-notifications', '0 2 * * *', async () => {
      try {
        await this.cleanupOldNotifications();
      } catch (error) {
        logger.error('Error in scheduled notification cleanup:', error);
      }
    });

    // Check for overdue appointments daily at 9 AM
    this.scheduleJob('check-overdue-appointments', '0 9 * * *', async () => {
      try {
        await this.checkOverdueAppointments();
      } catch (error) {
        logger.error('Error in scheduled overdue appointment check:', error);
      }
    });

    logger.info(`Initialized ${this.jobs.size} scheduled jobs`);
  }

  /**
   * Schedule a new job
   */
  private scheduleJob(name: string, schedule: string, task: () => Promise<void>): void {
    if (this.jobs.has(name)) {
      logger.warn(`Job ${name} already exists, stopping previous instance`);
      this.jobs.get(name)?.stop();
    }

    const job = cron.schedule(schedule, task, {
      timezone: 'America/New_York' // Adjust timezone as needed
    });

    this.jobs.set(name, job);
    logger.info(`Scheduled job: ${name} with schedule: ${schedule}`);
  }

  /**
   * Stop a specific job
   */
  public stopJob(name: string): void {
    const job = this.jobs.get(name);
    if (job) {
      job.stop();
      this.jobs.delete(name);
      logger.info(`Stopped job: ${name}`);
    }
  }

  /**
   * Stop all jobs
   */
  public stopAll(): void {
    for (const [name, job] of this.jobs) {
      job.stop();
      logger.info(`Stopped job: ${name}`);
    }
    this.jobs.clear();
    logger.info('Stopped all scheduled jobs');
  }

  /**
   * Get job status
   */
  public getJobStatus(): { name: string; running: boolean }[] {
    return Array.from(this.jobs.entries()).map(([name, job]) => ({
      name,
      running: job.getStatus() === 'scheduled'
    }));
  }

  /**
   * Clean up old notification records
   */
  private async cleanupOldNotifications(): Promise<void> {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    try {
      // Delete notifications older than 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await prisma.notificationSchedule.deleteMany({
        where: {
          scheduledFor: {
            lt: thirtyDaysAgo
          },
          sent: true
        }
      });

      logger.info(`Cleaned up ${result.count} old notification records`);
    } catch (error) {
      logger.error('Error cleaning up old notifications:', error);
    } finally {
      await prisma.$disconnect();
    }
  }

  /**
   * Check for overdue appointments and send alerts
   */
  private async checkOverdueAppointments(): Promise<void> {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    try {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Find appointments that were scheduled for yesterday but not completed
      const overdueAppointments = await prisma.appointment.findMany({
        where: {
          dateTime: {
            gte: yesterday,
            lt: now
          },
          status: {
            in: ['scheduled', 'confirmed']
          }
        },
        include: {
          party: true,
          member: true,
          individualCustomer: true,
          tailor: true
        }
      });

      if (overdueAppointments.length > 0) {
        logger.warn(`Found ${overdueAppointments.length} overdue appointments`);
        
        // TODO: Send alerts to staff about overdue appointments
        // This could be implemented as email alerts to managers or dashboard notifications
        
        for (const appointment of overdueAppointments) {
          logger.warn(`Overdue appointment: ${appointment.id} - ${appointment.type} scheduled for ${appointment.dateTime}`);
        }
      }
    } catch (error) {
      logger.error('Error checking overdue appointments:', error);
    } finally {
      await prisma.$disconnect();
    }
  }
}

// Export singleton instance
export const scheduledJobService = ScheduledJobService.getInstance();
