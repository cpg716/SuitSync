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

// Get single checklist with items and assignments
export const getChecklistById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const checklist = await prisma.checklist.findUnique({
      where: { id },
      include: {
        items: { orderBy: { order: 'asc' } },
        assignments: {
          include: {
            assignedTo: { select: { id: true, name: true, photoUrl: true } },
            assignedBy: { select: { id: true, name: true, photoUrl: true } }
          }
        },
        createdBy: { select: { id: true, name: true, photoUrl: true } }
      }
    });
    if (!checklist) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(checklist);
  } catch (error) {
    const { status, message } = handlePrismaError(error);
    res.status(status).json({ error: message });
  }
};

// Update checklist core fields and items (replace items)
export const updateChecklist = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const { title, description, frequency, isRequired, estimatedMinutes, items } = req.body as any;
    const updated = await prisma.checklist.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(frequency !== undefined ? { frequency } : {}),
        ...(isRequired !== undefined ? { isRequired: !!isRequired } : {}),
        ...(estimatedMinutes !== undefined ? { estimatedMinutes } : {}),
        ...(Array.isArray(items) ? { items: { deleteMany: {}, create: items.map((it: any, idx: number) => ({ title: it.title, description: it.description, isRequired: !!it.isRequired, order: idx })) } } : {})
      },
      include: { items: { orderBy: { order: 'asc' } } }
    });
    res.json(updated);
    try { await AuditLogService.logAction((req as any).user?.id || null, 'update', 'Checklist', id, { title, frequency, isRequired, estimatedMinutes }); } catch {}
  } catch (error) {
    const { status, message } = handlePrismaError(error);
    res.status(status).json({ error: message });
  }
};
// Templates: list
export const listChecklistTemplates = async (req: Request, res: Response): Promise<void> => {
  try {
    logger.info('Fetching checklist templates');
    const templates = await prisma.checklistTemplate.findMany({
      include: {
        items: { orderBy: { order: 'asc' } },
        createdBy: { select: { id: true, name: true, photoUrl: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    logger.info(`Found ${templates.length} checklist templates`);
    res.json(templates);
  } catch (error) {
    logger.error('Error fetching checklist templates:', error);
    logger.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta
    });
    // Return empty array instead of 500 to prevent frontend crashes
    res.json([]);
  }
};

// Templates: create/update simple
export const upsertChecklistTemplate = async (req: Request, res: Response): Promise<void> => {
  const userId = await resolveLocalUserId(req);
  if (!userId) { res.status(400).json({ error: 'Unable to resolve user' }); return; }
  const { id, title, description, frequency, isRequired, estimatedMinutes, items } = req.body as any;
  if (id) {
    const updated = await prisma.checklistTemplate.update({
      where: { id: Number(id) },
      data: {
        title, description, frequency, isRequired: !!isRequired, estimatedMinutes: estimatedMinutes ?? null,
        items: {
          deleteMany: {},
          create: (items || []).map((it: any, idx: number) => ({ title: it.title, description: it.description, isRequired: !!it.isRequired, order: idx }))
        }
      },
      include: { items: true }
    });
    res.json(updated); return;
  }
  const created = await prisma.checklistTemplate.create({
    data: {
      title, description, frequency, isRequired: !!isRequired, estimatedMinutes: estimatedMinutes ?? null, createdById: userId,
      items: { create: (items || []).map((it: any, idx: number) => ({ title: it.title, description: it.description, isRequired: !!it.isRequired, order: idx })) }
    },
    include: { items: true }
  });
  res.status(201).json(created);
};

// Templates: instantiate to assignment
export const assignTemplate = async (req: Request, res: Response): Promise<void> => {
  const userId = await resolveLocalUserId(req);
  if (!userId) { res.status(400).json({ error: 'Unable to resolve user' }); return; }
  const { templateId, userIds, dueDate } = req.body as any;
  const tpl = await prisma.checklistTemplate.findUnique({ where: { id: Number(templateId) }, include: { items: { orderBy: { order: 'asc' } } } }) as any;
  if (!tpl) { res.status(404).json({ error: 'Template not found' }); return; }
  // Create checklist from template then assign
  const checklist = await prisma.checklist.create({
    data: {
      title: tpl.title,
      description: tpl.description,
      frequency: tpl.frequency,
      isRequired: tpl.isRequired,
      estimatedMinutes: tpl.estimatedMinutes,
      createdById: userId,
      items: { create: tpl.items.map((it, idx) => ({ title: it.title, description: it.description, isRequired: it.isRequired, order: idx })) }
    },
    include: { items: true }
  });
  if (Array.isArray(userIds) && userIds.length) {
    const due = dueDate ? new Date(dueDate) : null;
    await Promise.all(userIds.map((uid: number) => prisma.checklistAssignment.create({ data: { checklistId: checklist.id, assignedToId: Number(uid), assignedById: userId, dueDate: due } })));
  }
  res.status(201).json(checklist);
};

// Create new checklist
async function resolveLocalUserId(req: Request): Promise<number | null> {
  const u: any = (req as any).user || {};
  logger.info('Resolving local user ID for:', { 
    lightspeedId: u.lightspeedId, 
    lightspeedEmployeeId: u.lightspeedEmployeeId, 
    email: u.email,
    name: u.name 
  });
  
  // 1) Prefer mapped local user id
  if (typeof u.localUserId === 'number' && Number.isFinite(u.localUserId)) {
    logger.info('Using existing localUserId:', u.localUserId);
    return u.localUserId;
  }
  
  // 2) Try to locate by Lightspeed employee id
  const lsId = u.lightspeedEmployeeId || u.lightspeedId || u.id;
  if (lsId) {
    const found = await prisma.user.findFirst({ 
      where: { 
        OR: [
          { lightspeedEmployeeId: String(lsId) },
          { id: typeof u.id === 'number' ? u.id : undefined }
        ] 
      } 
    });
    if (found) {
      logger.info('Found existing user by Lightspeed ID:', found.id);
      return found.id;
    }
  }
  
  // 3) Try to find by email
  if (u.email) {
    const found = await prisma.user.findFirst({ where: { email: u.email } });
    if (found) {
      logger.info('Found existing user by email:', found.id);
      return found.id;
    }
  }
  
  // 4) Create a new local user record if we have Lightspeed user data
  if (u.email && u.name) {
    try {
      const newUser = await prisma.user.create({
        data: {
          email: u.email,
          name: u.name,
          role: u.role || 'user',
          lightspeedEmployeeId: lsId ? String(lsId) : null,
          photoUrl: u.photoUrl || null
        }
      });
      logger.info('Created new local user:', newUser.id);
      return newUser.id;
    } catch (error) {
      logger.error('Failed to create local user:', error);
    }
  }
  
  // 5) Fallback to any admin user if available
  const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
  if (admin) {
    logger.info('Using fallback admin user:', admin.id);
    return admin.id;
  }
  
  logger.error('Could not resolve local user ID');
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

// Delete checklist (admin)
export const deleteChecklist = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    await prisma.checklist.delete({ where: { id } });
    res.status(204).send();
    try {
      await AuditLogService.logAction((req as any).user?.id || null, 'delete', 'Checklist', id, {});
    } catch {}
  } catch (error) {
    const { status, message } = handlePrismaError(error);
    res.status(status).json({ error: message });
  }
};

// Unassign checklist assignment (admin)
export const deleteChecklistAssignment = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.assignmentId);
    await prisma.checklistAssignment.delete({ where: { id } });
    res.status(204).send();
    try {
      await AuditLogService.logAction((req as any).user?.id || null, 'delete', 'ChecklistAssignment', id, {});
    } catch {}
  } catch (error) {
    const { status, message } = handlePrismaError(error);
    res.status(status).json({ error: message });
  }
};

// Get full detail of a checklist assignment including latest execution (admin view-as-user)
export const getAssignmentDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    const assignmentId = Number(req.params.assignmentId);
    const assignment = await prisma.checklistAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        assignedTo: { select: { id: true, name: true, photoUrl: true, email: true } },
        assignedBy: { select: { id: true, name: true, photoUrl: true, email: true } },
        checklist: { include: { items: { orderBy: { order: 'asc' } }, createdBy: { select: { id: true, name: true, photoUrl: true, email: true } } } },
      }
    });
    if (!assignment) { res.status(404).json({ error: 'Assignment not found' }); return; }
    const execution = await prisma.checklistExecution.findFirst({
      where: { assignmentId: assignment.id },
      include: { itemExecutions: { include: { item: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ assignment, execution });
  } catch (error) {
    const { status, message } = handlePrismaError(error);
    res.status(status).json({ error: message });
  }
};