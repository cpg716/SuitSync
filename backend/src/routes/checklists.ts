import express from 'express';
import { authMiddleware, requirePermission } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { asyncHandler } from '../utils/asyncHandler';
import { z } from 'zod';
import {
  getChecklists,
  createChecklist,
  assignChecklist,
  getUserChecklists,
  startChecklistExecution,
  updateChecklistItem,
  getChecklistAnalytics
} from '../controllers/checklistsController';

const router = express.Router();

// Validation schemas
const createChecklistSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
  isRequired: z.boolean().optional(),
  estimatedMinutes: z.number().int().min(1).max(480).optional(),
  items: z.array(z.object({
    title: z.string().min(1).max(255),
    description: z.string().max(500).optional(),
    isRequired: z.boolean().optional()
  })).min(1)
});

const assignChecklistSchema = z.object({
  userIds: z.array(z.number().int().positive()).min(1),
  dueDate: z.string().datetime().optional()
});

const updateItemSchema = z.object({
  isCompleted: z.boolean(),
  notes: z.string().max(500).optional()
});

// Routes
router.get('/', 
  authMiddleware, 
  requirePermission('admin', 'read'),
  asyncHandler(getChecklists)
);

router.post('/', 
  authMiddleware, 
  requirePermission('admin', 'write'),
  validateBody(createChecklistSchema),
  asyncHandler(createChecklist)
);

router.post('/:checklistId/assign', 
  authMiddleware, 
  requirePermission('admin', 'write'),
  validateBody(assignChecklistSchema),
  asyncHandler(assignChecklist)
);

router.get('/my-checklists', 
  authMiddleware,
  asyncHandler(getUserChecklists)
);

router.post('/assignments/:assignmentId/start', 
  authMiddleware,
  asyncHandler(startChecklistExecution)
);

router.put('/executions/:executionId/items/:itemId', 
  authMiddleware,
  validateBody(updateItemSchema),
  asyncHandler(updateChecklistItem)
);

router.get('/analytics', 
  authMiddleware, 
  requirePermission('admin', 'read'),
  asyncHandler(getChecklistAnalytics)
);

export default router;