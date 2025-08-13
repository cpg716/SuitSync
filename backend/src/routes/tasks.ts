import express from 'express';
import { authMiddleware, requirePermission } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { asyncHandler } from '../utils/asyncHandler';
import { z } from 'zod';
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  getUserTasks,
  getTaskAnalytics,
  bulkCreateTasks
} from '../controllers/tasksController';
const router = express.Router();

// Validation schemas
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const dateTime = z.string().datetime();
const dateOrDateTime = z.union([dateOnly, dateTime]);

const createTaskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assignedToId: z.number().int().positive(),
  dueDate: dateOrDateTime.optional(),
  estimatedMinutes: z.number().int().min(1).max(480).optional(),
  customerId: z.number().int().positive().optional()
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE']).optional(),
  dueDate: dateOrDateTime.optional(),
  estimatedMinutes: z.number().int().min(1).max(480).optional(),
  notes: z.string().max(1000).optional()
});

const bulkCreateTaskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assignedToIds: z.array(z.number().int().positive()).min(1),
  dueDate: z.string().datetime().optional(),
  estimatedMinutes: z.number().int().min(1).max(480).optional(),
  customerId: z.number().int().positive().optional()
});

// Routes
router.get('/', authMiddleware, asyncHandler(getTasks));

router.post('/', authMiddleware, validateBody(createTaskSchema), asyncHandler(createTask));

router.post('/bulk', authMiddleware, validateBody(bulkCreateTaskSchema), asyncHandler(bulkCreateTasks));

router.put('/:id', authMiddleware, validateBody(updateTaskSchema), asyncHandler(updateTask));

router.delete('/:id', authMiddleware, asyncHandler(deleteTask));

router.get('/my-tasks', authMiddleware, asyncHandler(getUserTasks));

router.get('/analytics', authMiddleware, asyncHandler(getTaskAnalytics));

export default router;