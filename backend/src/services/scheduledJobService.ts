import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import { sendDailyStaffNotifications } from './staffNotificationService';
import { processPendingNotifications } from './notificationSchedulingService';

const prisma = new PrismaClient();

// Scheduled jobs configuration
const JOBS = {
  'daily-staff-notifications': {
    cron: '0 9 * * *', // 9:00 AM daily
    handler: sendDailyStaffNotifications,
    description: 'Send daily staff notifications for appointments'
  },
  'process-notifications': {
    cron: '*/5 * * * *', // Every 5 minutes
    handler: processPendingNotifications,
    description: 'Process pending notification schedules'
  },
  'cleanup-notifications': {
    cron: '0 2 * * *', // 2:00 AM daily
    handler: async () => {
      try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 30); // Keep 30 days
        
        const result = await prisma.notificationSchedule.deleteMany({
          where: {
            scheduledFor: {
              lt: cutoffDate
            },
            sent: true
          }
        });
        
        logger.info(`Cleaned up ${result.count} old notification schedules`);
      } catch (error) {
        logger.error('Error cleaning up notifications:', error);
      }
    },
    description: 'Clean up old notification schedules'
  },
  'check-overdue-appointments': {
    cron: '0 8 * * *', // 8:00 AM daily
    handler: async () => {
      try {
        const overdueDate = new Date();
        overdueDate.setDate(overdueDate.getDate() - 1); // Yesterday
        
        const overdueAppointments = await prisma.appointment.findMany({
          where: {
            dateTime: {
              lt: overdueDate
            },
            status: {
              in: ['scheduled', 'confirmed']
            }
          },
          include: {
            individualCustomer: true,
            member: {
              include: {
                party: true
              }
            },
            tailor: true
          }
        });
        
        if (overdueAppointments.length > 0) {
          logger.warn(`Found ${overdueAppointments.length} overdue appointments`);
          
          // Update status to 'no_show'
          await prisma.appointment.updateMany({
            where: {
              id: {
                in: overdueAppointments.map(apt => apt.id)
              }
            },
            data: {
              status: 'no_show'
            }
          });
        }
      } catch (error) {
        logger.error('Error checking overdue appointments:', error);
      }
    },
    description: 'Check for overdue appointments and update status'
  },
  'sync-customers': {
    cron: '0 6 * * *', // 6:00 AM daily
    handler: async () => {
      try {
        logger.info('Starting daily customer sync from Lightspeed');
        const { syncCustomers } = require('./syncService');
        await syncCustomers({});
        logger.info('Daily customer sync completed successfully');
      } catch (error) {
        logger.error('Error during customer sync:', error);
      }
    },
    description: 'Sync customers from Lightspeed'
  }
};

// Job scheduler state
let jobScheduler: any = null;
const activeJobs = new Map<string, any>();

/**
 * Initialize the job scheduler
 */
export async function initializeScheduledJobs(): Promise<void> {
  try {
    // In production, you would use a proper job scheduler like node-cron
    // For now, we'll simulate the scheduling with setInterval
    
    logger.info('Initializing scheduled jobs...');
    
    // Start the daily staff notifications job (simulate 9am daily)
    startJob('daily-staff-notifications');
    
    // Start the notification processing job (every 5 minutes)
    startJob('process-notifications');
    
    // Start the cleanup job (simulate 2am daily)
    startJob('cleanup-notifications');
    
    // Start the overdue appointments check (simulate 8am daily)
    startJob('check-overdue-appointments');
    
    // Start the customer sync job (simulate 6am daily)
    startJob('sync-customers');
    
    logger.info('Scheduled jobs initialized successfully');
  } catch (error) {
    logger.error('Error initializing scheduled jobs:', error);
  }
}

/**
 * Start a specific job
 */
function startJob(jobName: string): void {
  const job = JOBS[jobName as keyof typeof JOBS];
  if (!job) {
    logger.error(`Unknown job: ${jobName}`);
    return;
  }
  
  try {
    // For development, we'll run jobs more frequently
    // In production, use proper cron scheduling
    let interval: number;
    
    switch (jobName) {
      case 'daily-staff-notifications':
        interval = 24 * 60 * 60 * 1000; // 24 hours
        break;
      case 'process-notifications':
        interval = 5 * 60 * 1000; // 5 minutes
        break;
      case 'cleanup-notifications':
        interval = 24 * 60 * 60 * 1000; // 24 hours
        break;
      case 'check-overdue-appointments':
        interval = 24 * 60 * 60 * 1000; // 24 hours
        break;
      case 'sync-customers':
        interval = 24 * 60 * 60 * 1000; // 24 hours
        break;
      default:
        interval = 60 * 60 * 1000; // 1 hour default
    }
    
    const timer = setInterval(async () => {
      try {
        logger.info(`Running scheduled job: ${jobName}`);
        await job.handler();
        logger.info(`Completed scheduled job: ${jobName}`);
      } catch (error) {
        logger.error(`Error in scheduled job ${jobName}:`, error);
      }
    }, interval);
    
    activeJobs.set(jobName, timer);
    logger.info(`Started job: ${jobName} (${job.description})`);
  } catch (error) {
    logger.error(`Error starting job ${jobName}:`, error);
  }
}

/**
 * Stop all scheduled jobs
 */
export function stopAllJobs(): void {
  logger.info('Stopping all scheduled jobs...');
  
  for (const [jobName, timer] of activeJobs) {
    clearInterval(timer);
    logger.info(`Stopped job: ${jobName}`);
  }
  
  activeJobs.clear();
}

/**
 * Get status of all jobs
 */
export function getJobStatus(): { [key: string]: { active: boolean; description: string } } {
  const status: { [key: string]: { active: boolean; description: string } } = {};
  
  for (const [jobName, job] of Object.entries(JOBS)) {
    status[jobName] = {
      active: activeJobs.has(jobName),
      description: job.description
    };
  }
  
  return status;
}
