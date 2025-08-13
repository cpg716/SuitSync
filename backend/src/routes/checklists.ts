import express from 'express';
import { authMiddleware, requirePermission } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { asyncHandler } from '../utils/asyncHandler';
import { z } from 'zod';
import { 
  getChecklists,
  getChecklistById,
  createChecklist,
  updateChecklist,
  assignChecklist,
  getUserChecklists,
  startChecklistExecution,
  updateChecklistItem,
  getChecklistAnalytics,
  listChecklistTemplates,
  upsertChecklistTemplate,
  assignTemplate,
  deleteChecklist,
  deleteChecklistAssignment
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

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const dateTime = z.string().datetime();
const dateOrDateTime = z.union([dateOnly, dateTime]);

const assignChecklistSchema = z.object({
  userIds: z.array(z.number().int().positive()).min(1),
  dueDate: dateOrDateTime.optional()
});

const updateChecklistSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']).optional(),
  isRequired: z.boolean().optional(),
  estimatedMinutes: z.number().int().min(1).max(480).optional(),
  isActive: z.boolean().optional(),
});

const updateItemSchema = z.object({
  isCompleted: z.boolean(),
  notes: z.string().max(500).optional()
});

// Routes (place static paths before numeric id routes to avoid conflicts)

// Templates
router.get('/templates', authMiddleware, requirePermission('admin', 'read'), asyncHandler(listChecklistTemplates));
router.post('/templates', authMiddleware, requirePermission('admin', 'write'), asyncHandler(upsertChecklistTemplate));
router.post('/templates/assign', authMiddleware, requirePermission('admin', 'write'), asyncHandler(assignTemplate));

router.get('/', 
  authMiddleware, 
  requirePermission('admin', 'read'),
  asyncHandler(getChecklists)
);

router.get('/my-checklists', 
  authMiddleware,
  asyncHandler(getUserChecklists)
);

router.get('/:id(\\d+)', authMiddleware, requirePermission('admin','read'), asyncHandler(getChecklistById));

router.post('/', 
  authMiddleware, 
  requirePermission('admin', 'write'),
  validateBody(createChecklistSchema),
  asyncHandler(createChecklist)
);

router.put('/:id(\\d+)', authMiddleware, requirePermission('admin','write'), asyncHandler(updateChecklist));

router.post('/:checklistId(\\d+)/assign', 
  authMiddleware, 
  requirePermission('admin', 'write'),
  validateBody(assignChecklistSchema),
  asyncHandler(assignChecklist)
);

router.post('/assignments/:assignmentId(\\d+)/start', 
  authMiddleware,
  asyncHandler(startChecklistExecution)
);

router.put('/executions/:executionId(\\d+)/items/:itemId(\\d+)', 
  authMiddleware,
  validateBody(updateItemSchema),
  asyncHandler(updateChecklistItem)
);

router.get('/analytics', 
  authMiddleware, 
  requirePermission('admin', 'read'),
  asyncHandler(getChecklistAnalytics)
);

// Delete checklist
router.delete('/:id(\\d+)', authMiddleware, requirePermission('admin', 'write'), asyncHandler(deleteChecklist));
router.delete('/assignments/:assignmentId(\\d+)', authMiddleware, requirePermission('admin', 'write'), asyncHandler(deleteChecklistAssignment));

export default router;