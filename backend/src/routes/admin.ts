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
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

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