import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

const prisma = new PrismaClient().$extends(withAccelerate());

export const getSettings = async (req: Request, res: Response) => {
  let settings = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!settings) {
    settings = await prisma.settings.create({
      data: {
        id: 1,
        reminderIntervals: '24,4',
        emailSubject: 'Reminder: Your appointment at {shopName}',
        emailBody: 'Hi {customerName},\nThis is a reminder for your appointment with {partyName} on {dateTime}.',
        smsBody: 'Reminder: {partyName} appointment on {dateTime} at {shopName}.',
      },
    });
  }
  res.json(settings);
};

export const updateSettings = async (req: Request, res: Response) => {
  const { reminderIntervals, emailSubject, emailBody, smsBody } = req.body;
  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: { reminderIntervals, emailSubject, emailBody, smsBody },
    create: { id: 1, reminderIntervals, emailSubject, emailBody, smsBody },
  });
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