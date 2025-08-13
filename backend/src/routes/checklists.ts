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
router.get('/templates', authMiddleware, asyncHandler(listChecklistTemplates));
router.post('/templates', authMiddleware, asyncHandler(upsertChecklistTemplate));
router.post('/templates/assign', authMiddleware, asyncHandler(assignTemplate));

router.get('/', authMiddleware, asyncHandler(getChecklists));

router.get('/my-checklists', authMiddleware, asyncHandler(getUserChecklists));

router.get('/:id(\\d+)', authMiddleware, asyncHandler(getChecklistById));

router.post('/', authMiddleware, validateBody(createChecklistSchema), asyncHandler(createChecklist));

router.put('/:id(\\d+)', authMiddleware, asyncHandler(updateChecklist));

router.post('/:checklistId(\\d+)/assign', authMiddleware, validateBody(assignChecklistSchema), asyncHandler(assignChecklist));

router.post('/assignments/:assignmentId(\\d+)/start', authMiddleware, asyncHandler(startChecklistExecution));

router.put('/executions/:executionId(\\d+)/items/:itemId(\\d+)', authMiddleware, validateBody(updateItemSchema), asyncHandler(updateChecklistItem));

router.get('/analytics', authMiddleware, asyncHandler(getChecklistAnalytics));

// Delete checklist
router.delete('/:id(\\d+)', authMiddleware, asyncHandler(deleteChecklist));
router.delete('/assignments/:assignmentId(\\d+)', authMiddleware, asyncHandler(deleteChecklistAssignment));

export default router;