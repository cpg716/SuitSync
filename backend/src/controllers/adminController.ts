import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import logger from '../utils/logger';
import { getJobStatus } from '../services/scheduledJobService';
import { createClient } from 'redis';
import os from 'os';

const prisma = new PrismaClient().$extends(withAccelerate());

export const getSettings = async (req: Request, res: Response) => {
  try {
    let settings = await prisma.settings.findUnique({ where: { id: 1 } });
    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          id: 1,
          reminderIntervals: '24,3',
          earlyMorningCutoff: '09:30',
          emailSubject: 'Reminder: Your appointment at {shopName}',
          emailBody: 'Hi {customerName},\n\nThis is a reminder for your appointment with {partyName} on {dateTime}.\n\nThank you!',
          smsBody: 'Reminder: {partyName} appointment on {dateTime} at {shopName}.',
          pickupReadySubject: 'Your garment is ready for pickup!',
          pickupReadyEmail: 'Hi {customerName},\n\nYour garment for {partyName} is ready for pickup!\n\nPlease visit us at your earliest convenience.',
          pickupReadySms: 'Your garment for {partyName} is ready for pickup at {shopName}!'
        },
      });
    }
    res.json(settings);
  } catch (error) {
    logger.error('Error in getSettings:', error);
    console.error('Error in getSettings:', error);
    res.status(500).json({ error: 'Internal server error', details: error instanceof Error ? error.message : error });
  }
};

export const updateSettings = async (req: Request, res: Response) => {
  const {
    reminderIntervals,
    earlyMorningCutoff,
    emailSubject,
    emailBody,
    smsBody,
    pickupReadySubject,
    pickupReadyEmail,
    pickupReadySms,
    onlineBookingEnabled,
    onlineBookingAllowedTypes,
    onlineBookingAdvanceDays,
    onlineBookingIframeAllowedOrigins,
    onlineBookingTimezone,
    onlineBookingMinNoticeMinutes,
    onlineBookingMaxPerDay,
    onlineBookingRequirePhone,
    bookingBusinessName,
    bookingBusinessSubtitle,
    bookingBusinessAddress,
    bookingBusinessPhone,
    bookingLogoUrl,
    bookingPrimaryColor,
    bookingWelcomeMessage,
    bookingSuccessMessage,
  } = req.body;

  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: {
      reminderIntervals,
      earlyMorningCutoff,
      emailSubject,
      emailBody,
      smsBody,
      pickupReadySubject,
      pickupReadyEmail,
      pickupReadySms,
      onlineBookingEnabled,
      onlineBookingAllowedTypes,
      onlineBookingAdvanceDays,
      onlineBookingIframeAllowedOrigins,
      onlineBookingTimezone,
      onlineBookingMinNoticeMinutes,
      onlineBookingMaxPerDay,
      onlineBookingRequirePhone,
      bookingBusinessName,
      bookingBusinessSubtitle,
      bookingBusinessAddress,
      bookingBusinessPhone,
      bookingLogoUrl,
      bookingPrimaryColor,
      bookingWelcomeMessage,
      bookingSuccessMessage,
    },
    create: {
      id: 1,
      reminderIntervals,
      earlyMorningCutoff,
      emailSubject,
      emailBody,
      smsBody,
      pickupReadySubject,
      pickupReadyEmail,
      pickupReadySms,
      onlineBookingEnabled,
      onlineBookingAllowedTypes,
      onlineBookingAdvanceDays,
      onlineBookingIframeAllowedOrigins,
      onlineBookingTimezone,
      onlineBookingMinNoticeMinutes,
      onlineBookingMaxPerDay,
      onlineBookingRequirePhone,
      bookingBusinessName,
      bookingBusinessSubtitle,
      bookingBusinessAddress,
      bookingBusinessPhone,
      bookingLogoUrl,
      bookingPrimaryColor,
      bookingWelcomeMessage,
      bookingSuccessMessage,
    },
  });

  logger.info('Notification settings updated', { userId: req.session?.userId });
  res.json(settings);
};

export const getStaff = async (req: Request, res: Response) => {
  const staff = await prisma.user.findMany({ orderBy: { name: 'asc' } });
  res.json(staff);
};

export const updateStaff = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { commissionRate } = req.body;
  const user = await prisma.user.update({
    where: { id: Number(id) },
    data: { commissionRate },
  });
  res.json(user);
};

export const getTaskTypes = async (req: Request, res: Response) => {
  const taskTypes = await prisma.alterationTaskType.findMany({ orderBy: { name: 'asc' } });
  res.json(taskTypes);
};

export const upsertTaskType = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, defaultDuration, parts } = req.body;
  const data = { name, defaultDuration, parts: parts || '' };
  if (id) {
    const taskType = await prisma.alterationTaskType.update({ where: { id: Number(id) }, data });
    res.json(taskType);
  } else {
    const taskType = await prisma.alterationTaskType.create({ data });
    res.json(taskType);
  }
};

export const deleteTaskType = async (req: Request, res: Response) => {
  const { id } = req.params;
  await prisma.alterationTaskType.delete({ where: { id: Number(id) } });
  res.status(204).send();
};

export const getTailorAbilities = async (req: Request, res: Response) => {
  const abilities = await prisma.tailorAbility.findMany({
    include: {
      tailor: { select: { id: true, name: true } },
      taskType: { select: { id: true, name: true } },
    },
    orderBy: { tailor: { name: 'asc' } },
  });
  res.json(abilities);
};

export const upsertTailorAbility = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { tailorId, taskTypeId, proficiency } = req.body;
  const data = {
    tailorId: Number(tailorId),
    taskTypeId: Number(taskTypeId),
    proficiency: Number(proficiency),
  };
  if (id) {
    const ability = await prisma.tailorAbility.update({ where: { id: Number(id) }, data });
    res.json(ability);
  } else {
    const ability = await prisma.tailorAbility.create({ data });
    res.json(ability);
  }
};

export const deleteTailorAbility = async (req: Request, res: Response) => {
  const { id } = req.params;
  await prisma.tailorAbility.delete({ where: { id: Number(id) } });
  res.status(204).send();
};

export const getTailorSchedules = async (req: Request, res: Response) => {
  const schedules = await prisma.tailorSchedule.findMany({
    include: { tailor: { select: { id: true, name: true } } },
    orderBy: [{ tailor: { name: 'asc' } }, { dayOfWeek: 'asc' }],
  });
  res.json(schedules);
};

export const upsertTailorSchedule = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { tailorId, dayOfWeek, startTime, endTime } = req.body;
  const data = {
    tailorId: Number(tailorId),
    dayOfWeek: Number(dayOfWeek),
    startTime,
    endTime,
  };
  if (id) {
    const schedule = await prisma.tailorSchedule.update({ where: { id: Number(id) }, data });
    res.json(schedule);
  } else {
    const schedule = await prisma.tailorSchedule.create({ data });
    res.json(schedule);
  }
};

export const deleteTailorSchedule = async (req: Request, res: Response) => {
  const { id } = req.params;
  await prisma.tailorSchedule.delete({ where: { id: Number(id) } });
  res.status(204).send();
};

export const getSkills = async (req: Request, res: Response) => {
  const abilities = await prisma.tailorAbility.findMany({
    include: {
      tailor: { select: { id: true, name: true } },
      taskType: { select: { id: true, name: true } },
    },
    orderBy: { tailor: { name: 'asc' } },
  });
  res.json(abilities);
};

// Notification Settings Endpoints
export const getNotificationSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    let settings = await prisma.settings.findUnique({ where: { id: 1 } });
    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          id: 1,
          reminderIntervals: '24,3',
          earlyMorningCutoff: '09:30',
          emailSubject: 'Reminder: Your appointment at {shopName}',
          emailBody: 'Hi {customerName},\n\nThis is a reminder for your appointment with {partyName} on {dateTime}.\n\nThank you!',
          smsBody: 'Reminder: {partyName} appointment on {dateTime} at {shopName}.',
          pickupReadySubject: 'Your garment is ready for pickup!',
          pickupReadyEmail: 'Hi {customerName},\n\nYour garment for {partyName} is ready for pickup!\n\nPlease visit us at your earliest convenience.',
          pickupReadySms: 'Your garment for {partyName} is ready for pickup at {shopName}!'
        },
      });
    }
    res.json(settings);
  } catch (error: any) {
    logger.error('Error getting notification settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateNotificationSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      reminderIntervals,
      earlyMorningCutoff,
      emailSubject,
      emailBody,
      smsBody,
      pickupReadySubject,
      pickupReadyEmail,
      pickupReadySms
    } = req.body;

    const settings = await prisma.settings.upsert({
      where: { id: 1 },
      update: {
        reminderIntervals,
        earlyMorningCutoff,
        emailSubject,
        emailBody,
        smsBody,
        pickupReadySubject,
        pickupReadyEmail,
        pickupReadySms
      },
      create: {
        id: 1,
        reminderIntervals,
        earlyMorningCutoff,
        emailSubject,
        emailBody,
        smsBody,
        pickupReadySubject,
        pickupReadyEmail,
        pickupReadySms
      },
    });

    logger.info('Notification settings updated', {
      userId: req.session?.userId,
      settings: { reminderIntervals, earlyMorningCutoff }
    });

    res.json(settings);
  } catch (error: any) {
    logger.error('Error updating notification settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Scheduled Jobs Management
export const getScheduledJobsStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const jobStatus = getJobStatus();
    res.json(jobStatus);
  } catch (error: any) {
    logger.error('Error getting scheduled jobs status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

async function getDashboardData() {
  // DB health
  let dbStatus: string = 'unknown', dbTables: { table_name: string }[] = [], dbError: string | null = null;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'ok';
    dbTables = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema='public'` as { table_name: string }[];
  } catch (e: any) {
    dbStatus = 'error';
    dbError = e && typeof e === 'object' && 'message' in e ? (e as any).message : String(e);
  }

  // Redis health
  let redisStatus: string = 'unknown', redisInfo: any = {}, redisError: string | null = null;
  try {
    const redis = createClient({ url: process.env.REDIS_URL });
    await redis.connect();
    redisStatus = 'ok';
    redisInfo = await redis.info();
    await redis.disconnect();
  } catch (e: any) {
    redisStatus = 'error';
    redisError = e && typeof e === 'object' && 'message' in e ? (e as any).message : String(e);
  }

  // Lightspeed health
  let lightspeed: { status: string; error?: string; syncStatuses?: any[] } = { status: 'unknown' };
  try {
    // Simulate a health check by pinging the DB for sync status
    const statuses = await prisma.syncStatus.findMany({ orderBy: { resource: 'asc' } });
    lightspeed = {
      status: 'ok',
      syncStatuses: statuses.map(s => ({
        ...s,
        lastSyncedVersion: s.lastSyncedVersion?.toString() || null,
        lastSyncedAt: s.lastSyncedAt?.toISOString() || null,
        createdAt: s.createdAt?.toISOString() || null,
        updatedAt: s.updatedAt?.toISOString() || null,
      }))
    };
  } catch (e: any) {
    lightspeed = { status: 'error', error: e && typeof e === 'object' && 'message' in e ? (e as any).message : String(e) };
  }

  // Job scheduler
  let jobs = getJobStatus();

  // App/server info
  const appInfo = {
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    node: process.version,
    env: process.env.NODE_ENV,
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
  };

  return {
    dbStatus, dbTables, dbError,
    redisStatus, redisInfo, redisError,
    lightspeed,
    jobs,
    appInfo
  };
}

export async function adminDashboard(req: Request, res: Response) {
  const data = await getDashboardData();
  // Render HTML dashboard
  res.set('Content-Type', 'text/html');
  res.send(`
    <html><head><title>SuitSync Backend Dashboard</title>
    <style>body{font-family:sans-serif;background:#f8fafc;color:#222}h1{color:#2563eb}table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:4px 8px}tr.ok{background:#d1fae5}tr.error{background:#fee2e2}</style>
    </head><body>
    <h1>SuitSync Backend Dashboard</h1>
    <h2>Database</h2>
    <table><tr><th>Status</th><td class="${data.dbStatus}">${data.dbStatus}</td></tr>
    <tr><th>Tables</th><td>${Array.isArray(data.dbTables) ? data.dbTables.map(t=>t.table_name).join(', ') : ''}</td></tr>
    ${data.dbError ? `<tr class="error"><th>Error</th><td>${data.dbError}</td></tr>` : ''}
    </table>
    <h2>Redis</h2>
    <table><tr><th>Status</th><td class="${data.redisStatus}">${data.redisStatus}</td></tr>
    <tr><th>Info</th><td><pre>${typeof data.redisInfo==='string'?data.redisInfo:JSON.stringify(data.redisInfo,null,2)}</pre></td></tr>
    ${data.redisError ? `<tr class="error"><th>Error</th><td>${data.redisError}</td></tr>` : ''}
    </table>
    <h2>Lightspeed</h2>
    <table><tr><th>Status</th><td>${data.lightspeed.status}</td></tr>
    ${'error' in data.lightspeed && data.lightspeed.error ? `<tr class="error"><th>Error</th><td>${data.lightspeed.error}</td></tr>` : ''}
    </table>
    <h2>Job Scheduler</h2>
    <table><tr><th>Job</th><th>Status</th><th>Last Run</th><th>Error</th></tr>
    ${Array.isArray(data.jobs) ? data.jobs.map(j => {
      const status = 'status' in j ? j.status || '' : '';
      const lastRun = 'lastRun' in j ? j.lastRun || '' : '';
      const error = 'error' in j ? j.error || '' : '';
      return `<tr class="${status}"><td>${j.name}</td><td>${status}</td><td>${lastRun}</td><td>${error}</td></tr>`;
    }).join('') : ''}
    </table>
    <h2>App Info</h2>
    <table>
      <tr><th>Uptime (s)</th><td>${data.appInfo.uptime.toFixed(0)}</td></tr>
      <tr><th>Memory (MB)</th><td>${(data.appInfo.memory.rss/1024/1024).toFixed(1)}</td></tr>
      <tr><th>Node</th><td>${data.appInfo.node}</td></tr>
      <tr><th>Env</th><td>${data.appInfo.env}</td></tr>
      <tr><th>Host</th><td>${data.appInfo.hostname}</td></tr>
      <tr><th>Platform</th><td>${data.appInfo.platform}</td></tr>
      <tr><th>Arch</th><td>${data.appInfo.arch}</td></tr>
    </table>
    </body></html>
  `);
}

export async function adminDashboardJson(req: Request, res: Response) {
  const data = await getDashboardData();
  res.json(data);
}