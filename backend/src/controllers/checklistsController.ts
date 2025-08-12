import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import logger from '../utils/logger';
import AuditLogService from '../services/AuditLogService';
import { handlePrismaError } from '../utils/dbErrorHandler';

const prisma = new PrismaClient().$extends(withAccelerate());

// Get all checklists with assignments
export const getChecklists = async (req: Request, res: Response): Promise<void> => {
  try {
    const { frequency, assignedToId } = req.query;
    
    const where: any = { isActive: true };
    if (frequency) where.frequency = frequency;
    
    const checklists = await prisma.checklist.findMany({
      where,
      include: {
        createdBy: { select: { id: true, name: true, photoUrl: true } },
        items: { orderBy: { order: 'asc' } },
        assignments: {
          where: assignedToId ? { assignedToId: Number(assignedToId) } : {},
          include: {
            assignedTo: { select: { id: true, name: true, photoUrl: true } },
            assignedBy: { select: { id: true, name: true, photoUrl: true } }
          }
        },
        _count: { select: { assignments: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(checklists);
  } catch (error) {
    logger.error('Error fetching checklists:', error);
    const { status, message } = handlePrismaError(error);
    res.status(status).json({ error: message });
  }
};

// Create new checklist
async function resolveLocalUserId(req: Request): Promise<number | null> {
  const u: any = (req as any).user || {};
  if (typeof u.localUserId === 'number' && Number.isFinite(u.localUserId)) return u.localUserId;
  const lsId = u.lightspeedEmployeeId || u.lightspeedId || u.id;
  if (lsId) {
    const found = await prisma.user.findFirst({ where: { OR: [
      { lightspeedEmployeeId: String(lsId) },
      { id: typeof u.id === 'number' ? u.id : undefined }
    ] } as any });
    if (found) return found.id;
  }
  const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
  if (admin) return admin.id;
  return null;
}

export const createChecklist = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, frequency, isRequired, estimatedMinutes, items, assignToUserIds, assignDueDate } = req.body as any;
    const userId = await resolveLocalUserId(req);
    if (!userId) {
      res.status(400).json({ error: 'Unable to resolve creating user. Ensure your account is linked to a local user.' });
      return;
    }

    const checklist = await prisma.checklist.create({
      data: {
        title,
        description,
        frequency,
        isRequired: isRequired || false,
        estimatedMinutes,
        createdById: userId,
        items: {
          create: items?.map((item: any, index: number) => ({
            title: item.title,
            description: item.description,
            isRequired: item.isRequired || false,
            order: index
          })) || []
        }
      },
      include: {
        createdBy: { select: { id: true, name: true, photoUrl: true } },
        items: { orderBy: { order: 'asc' } }
      }
    });

    // Optional immediate assignment at creation
    if (Array.isArray(assignToUserIds) && assignToUserIds.length > 0) {
      const due = assignDueDate ? new Date(assignDueDate) : null;
      await Promise.all(assignToUserIds.map((uid: number) => prisma.checklistAssignment.create({
        data: {
          checklistId: checklist.id,
          assignedToId: Number(uid),
          assignedById: userId,
          dueDate: due
        }
      })));
    }

    res.status(201).json(checklist);
    try {
      await AuditLogService.logAction(userId || null, 'create', 'Checklist', checklist.id, { frequency, isRequired, estimatedMinutes });
    } catch (e) {
      logger.warn('Failed to write audit log for createChecklist', e);
    }
  } catch (error) {
    logger.error('Error creating checklist:', error);
    const { status, message } = handlePrismaError(error);
    res.status(status).json({ error: message });
  }
};

// Assign checklist to users
export const assignChecklist = async (req: Request, res: Response): Promise<void> => {
  try {
    const { checklistId } = req.params;
    const { userIds, dueDate } = req.body;
    const assignedById = await resolveLocalUserId(req);
    if (!assignedById) { res.status(400).json({ error: 'Unable to resolve assigning user.' }); return; }

    const assignments = await Promise.all(
      userIds.map((userId: number) =>
        prisma.checklistAssignment.create({
          data: {
            checklistId: Number(checklistId),
            assignedToId: userId,
            assignedById,
            dueDate: dueDate ? new Date(dueDate) : null
          },
          include: {
            assignedTo: { select: { id: true, name: true, photoUrl: true } },
            assignedBy: { select: { id: true, name: true, photoUrl: true } },
            checklist: { include: { items: true } }
          }
        })
      )
    );

    res.status(201).json(assignments);
    try {
      await AuditLogService.logAction(assignedById || null, 'assign', 'Checklist', Number(checklistId), { userIds, dueDate });
    } catch (e) {
      logger.warn('Failed to write audit log for assignChecklist', e);
    }
  } catch (error) {
    logger.error('Error assigning checklist:', error);
    const { status, message } = handlePrismaError(error);
    res.status(status).json({ error: message });
  }
};

// Get user's assigned checklists
export const getUserChecklists = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = await resolveLocalUserId(req);
    if (!userId) { res.status(400).json({ error: 'Unable to resolve current user.' }); return; }
    const { date, status } = req.query;

    const targetDate = date ? new Date(date as string) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const executions = await prisma.checklistExecution.findMany({
      where: {
        userId,
        scheduledFor: { gte: startOfDay, lte: endOfDay },
        ...(status && { status: status as any })
      },
      include: {
        assignment: {
          include: {
            checklist: {
              include: {
                items: { orderBy: { order: 'asc' } },
                createdBy: { select: { id: true, name: true, photoUrl: true } }
              }
            },
            assignedBy: { select: { id: true, name: true, photoUrl: true } }
          }
        },
        itemExecutions: {
          include: {
            item: true
          }
        }
      },
      orderBy: { scheduledFor: 'asc' }
    });

    res.json(executions);
  } catch (error) {
    logger.error('Error fetching user checklists:', error);
    const { status, message } = handlePrismaError(error);
    res.status(status).json({ error: message });
  }
};

// Start checklist execution
export const startChecklistExecution = async (req: Request, res: Response): Promise<void> => {
  try {
    const { assignmentId } = req.params;
    const { scheduledFor } = req.body;
    const userId = (req as any).user.id;

    // Get assignment with checklist items
    const assignment = await prisma.checklistAssignment.findUnique({
      where: { id: Number(assignmentId) },
      include: {
        checklist: { include: { items: { orderBy: { order: 'asc' } } } }
      }
    }) as import('@prisma/client').Prisma.ChecklistAssignmentGetPayload<{
      include: { checklist: { include: { items: true } } }
    }> | null;

    if (!assignment) {
      res.status(404).json({ error: 'Assignment not found' });
      return;
    }

    const execution = await prisma.checklistExecution.create({
      data: {
        assignmentId: Number(assignmentId),
        userId,
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        scheduledFor: new Date(scheduledFor),
        itemExecutions: {
          create: assignment.checklist.items.map((item: any) => ({
            itemId: item.id,
            isCompleted: false
          }))
        }
      },
      include: {
        assignment: {
          include: {
            checklist: { include: { items: true } }
          }
        },
        itemExecutions: { include: { item: true } }
      }
    });

    res.status(201).json(execution);
    try {
      await AuditLogService.logAction(userId || null, 'start', 'ChecklistExecution', execution.id, { assignmentId, scheduledFor });
    } catch (e) {
      logger.warn('Failed to write audit log for startChecklistExecution', e);
    }
  } catch (error) {
    logger.error('Error starting checklist execution:', error);
    const { status, message } = handlePrismaError(error);
    res.status(status).json({ error: message });
  }
};

// Update checklist item completion
export const updateChecklistItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { executionId, itemId } = req.params;
    const { isCompleted, notes } = req.body;

    const itemExecution = await prisma.checklistItemExecution.update({
      where: {
        executionId_itemId: {
          executionId: Number(executionId),
          itemId: Number(itemId)
        }
      },
      data: {
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
        notes
      }
    });

    // Check if all items are completed
    const execution = await prisma.checklistExecution.findUnique({
      where: { id: Number(executionId) },
      include: {
        itemExecutions: true,
        assignment: { include: { checklist: { include: { items: true } } } }
      }
    }) as import('@prisma/client').Prisma.ChecklistExecutionGetPayload<{
      include: {
        itemExecutions: true,
        assignment: { include: { checklist: { include: { items: true } } } }
      }
    }> | null;

    if (execution) {
      const allCompleted = execution.itemExecutions.every((ie: any) => ie.isCompleted);
      const requiredCompleted = execution.itemExecutions
        .filter((ie: any) => execution.assignment.checklist.items.find((item: any) => item.id === ie.itemId)?.isRequired)
        .every((ie: any) => ie.isCompleted);

      if (allCompleted || requiredCompleted) {
        await prisma.checklistExecution.update({
          where: { id: Number(executionId) },
          data: {
            status: 'COMPLETED',
            completedAt: new Date()
          }
        });
      }
    }

    res.json(itemExecution);
    try {
      await AuditLogService.logAction((req as any).user?.id || null, 'update', 'ChecklistItemExecution', itemExecution.id, { executionId, itemId, isCompleted });
    } catch (e) {
      logger.warn('Failed to write audit log for updateChecklistItem', e);
    }
  } catch (error) {
    logger.error('Error updating checklist item:', error);
    const { status, message } = handlePrismaError(error);
    res.status(status).json({ error: message });
  }
};

// Get checklist analytics
export const getChecklistAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, userId } = req.query;

    const where: any = {};
    if (startDate && endDate) {
      where.scheduledFor = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }
    if (userId) where.userId = Number(userId);

    const [totalExecutions, completedExecutions, overdue] = await Promise.all([
      prisma.checklistExecution.count({ where }),
      prisma.checklistExecution.count({ where: { ...where, status: 'COMPLETED' } }),
      prisma.checklistExecution.count({
        where: {
          ...where,
          status: { in: ['NOT_STARTED', 'IN_PROGRESS'] },
          scheduledFor: { lt: new Date() }
        }
      })
    ]);

    const completionRate = totalExecutions > 0 ? (completedExecutions / totalExecutions) * 100 : 0;

    res.json({
      totalExecutions,
      completedExecutions,
      overdue,
      completionRate: Math.round(completionRate * 100) / 100
    });
  } catch (error) {
    logger.error('Error fetching checklist analytics:', error);
    const { status, message } = handlePrismaError(error);
    res.status(status).json({ error: message });
  }
};