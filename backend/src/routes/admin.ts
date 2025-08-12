import express from 'express';
import {
  getSettings,
  updateSettings,
  getStaff,
  updateStaff,
  getSkills,
  upsertTaskType,
  deleteTaskType,
  getTailorAbilities,
  upsertTailorAbility,
  deleteTailorAbility,
  getTailorSchedules,
  upsertTailorSchedule,
  deleteTailorSchedule,
  getTaskTypes,
  getNotificationSettings,
  updateNotificationSettings,
  getScheduledJobsStatus,
  adminDashboard,
  adminDashboardJson
} from '../controllers/adminController';
import { authMiddleware, requireAdmin } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();
const prisma = new PrismaClient().$extends(withAccelerate());

router.use(authMiddleware, requireAdmin);

router.get('/settings', asyncHandler(getSettings));
router.post('/settings', asyncHandler(updateSettings));

router.get('/settings/staff', asyncHandler(getStaff));
router.post('/settings/staff/:id', asyncHandler(updateStaff));

router.get('/settings/task-types', asyncHandler(getTaskTypes));
router.post('/settings/task-types/:id?', asyncHandler(upsertTaskType));
router.delete('/settings/task-types/:id', asyncHandler(deleteTaskType));

router.get('/settings/tailor-abilities', asyncHandler(getTailorAbilities));
router.post('/settings/tailor-abilities/:id?', asyncHandler(upsertTailorAbility));
router.delete('/settings/tailor-abilities/:id', asyncHandler(deleteTailorAbility));

router.get('/settings/tailor-schedules', asyncHandler(getTailorSchedules));
router.post('/settings/tailor-schedules/:id?', asyncHandler(upsertTailorSchedule));
router.delete('/settings/tailor-schedules/:id', asyncHandler(deleteTailorSchedule));

router.get('/settings/skills', asyncHandler(getSkills));

// Notification settings
router.get('/notification-settings', asyncHandler(getNotificationSettings));
router.put('/notification-settings', asyncHandler(updateNotificationSettings));

// Scheduled jobs status
router.get('/scheduled-jobs', asyncHandler(getScheduledJobsStatus));

router.get('/dashboard', adminDashboard);
router.get('/dashboard.json', adminDashboardJson);

export default router;

// Global holiday management
router.get('/holidays', asyncHandler(async (_req, res) => {
  const rows = await prisma.globalHoliday.findMany({ orderBy: { date: 'asc' } });
  res.json(rows);
}));
router.post('/holidays', asyncHandler(async (req, res) => {
  const { date, name, isClosed } = req.body;
  const d = new Date(date);
  const row = await prisma.globalHoliday.upsert({
    where: { date: d },
    update: { name, isClosed: !!isClosed },
    create: { date: d, name, isClosed: !!isClosed },
  });
  res.json(row);
}));
router.delete('/holidays', asyncHandler(async (req, res) => {
  const { date } = req.query;
  await prisma.globalHoliday.delete({ where: { date: new Date(String(date)) } });
  res.status(204).send();
}));

// Availability management endpoints (admin-only)
router.get('/availability/:userId', asyncHandler(async (req, res) => {
  const userId = Number(req.params.userId);
  const recurring = await prisma.userSchedule.findFirst({ where: { userId, weekStart: null } });
  const overrides = await prisma.userSchedule.findMany({ where: { userId, NOT: { weekStart: null } }, orderBy: { weekStart: 'asc' } });
  const exceptions = await prisma.scheduleException.findMany({ where: { userId }, orderBy: { date: 'asc' } });
  res.json({ recurring, overrides, exceptions });
}));

router.post('/availability/:userId/recurring', asyncHandler(async (req, res) => {
  const userId = Number(req.params.userId);
  const { days } = req.body;
  const record = await prisma.userSchedule.upsert({
    where: { userId_weekStart: { userId, weekStart: null } },
    update: { days },
    create: { userId, weekStart: null, days },
  });
  res.json(record);
}));

router.post('/availability/:userId/override', asyncHandler(async (req, res) => {
  const userId = Number(req.params.userId);
  const { weekStart, days } = req.body;
  const ws = new Date(weekStart);
  const record = await prisma.userSchedule.upsert({
    where: { userId_weekStart: { userId, weekStart: ws } },
    update: { days },
    create: { userId, weekStart: ws, days },
  });
  res.json(record);
}));

router.post('/availability/:userId/exception', asyncHandler(async (req, res) => {
  const userId = Number(req.params.userId);
  const { date, isOff, blocks, reason } = req.body;
  const d = new Date(date);
  const record = await prisma.scheduleException.upsert({
    where: { userId_date: { userId, date: d } },
    update: { isOff: !!isOff, blocks: blocks || null, reason },
    create: { userId, date: d, isOff: !!isOff, blocks: blocks || null, reason },
  });
  res.json(record);
}));

router.delete('/availability/:userId/exception', asyncHandler(async (req, res) => {
  const userId = Number(req.params.userId);
  const { date } = req.query;
  await prisma.scheduleException.delete({ where: { userId_date: { userId, date: new Date(String(date)) } } });
  res.status(204).send();
}));