import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import logger from '../utils/logger';
import { scheduledJobService } from '../services/scheduledJobService';

const prisma = new PrismaClient().$extends(withAccelerate());

export const getSettings = async (req: Request, res: Response) => {
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
    const jobStatus = scheduledJobService.getJobStatus();
    res.json(jobStatus);
  } catch (error: any) {
    logger.error('Error getting scheduled jobs status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};