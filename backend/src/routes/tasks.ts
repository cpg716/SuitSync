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
  getTaskAnalytics
} from '../controllers/tasksController';

const router = express.Router();

// Validation schemas
const createTaskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assignedToId: z.number().int().positive(),
  dueDate: z.string().datetime().optional(),
  estimatedMinutes: z.number().int().min(1).max(480).optional()
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE']).optional(),
  dueDate: z.string().datetime().optional(),
  estimatedMinutes: z.number().int().min(1).max(480).optional(),
  notes: z.string().max(1000).optional()
});

// Routes
router.get('/', 
  authMiddleware, 
  requirePermission('admin', 'read'),
  asyncHandler(getTasks)
);

router.post('/', 
  authMiddleware, 
  requirePermission('admin', 'write'),
  validateBody(createTaskSchema),
  asyncHandler(createTask)
);

router.put('/:id', 
  authMiddleware,
  validateBody(updateTaskSchema),
  asyncHandler(updateTask)
);

router.delete('/:id', 
  authMiddleware, 
  requirePermission('admin', 'write'),
  asyncHandler(deleteTask)
);

router.get('/my-tasks', 
  authMiddleware,
  asyncHandler(getUserTasks)
);

router.get('/analytics', 
  authMiddleware, 
  requirePermission('admin', 'read'),
  asyncHandler(getTaskAnalytics)
);

export default router;