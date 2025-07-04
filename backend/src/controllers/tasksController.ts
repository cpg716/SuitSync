import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import logger from '../utils/logger';
import { handlePrismaError } from '../utils/dbErrorHandler';

const prisma = new PrismaClient().$extends(withAccelerate());

// Get all tasks
export const getTasks = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, priority, assignedToId, assignedById } = req.query;
    
    const where: any = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assignedToId) where.assignedToId = Number(assignedToId);
    if (assignedById) where.assignedById = Number(assignedById);

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true, photoUrl: true, role: true } },
        assignedBy: { select: { id: true, name: true, photoUrl: true, role: true } }
      },
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    res.json(tasks);
  } catch (error) {
    logger.error('Error fetching tasks:', error);
    const { status, message } = handlePrismaError(error);
    res.status(status).json({ error: message });
  }
};

// Create new task
export const createTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, priority, assignedToId, dueDate, estimatedMinutes } = req.body;
    const assignedById = (req as any).user.id;

    const task = await prisma.task.create({
      data: {
        title,
        description,
        priority: priority || 'MEDIUM',
        assignedToId,
        assignedById,
        dueDate: dueDate ? new Date(dueDate) : null,
        estimatedMinutes
      },
      include: {
        assignedTo: { select: { id: true, name: true, photoUrl: true, role: true } },
        assignedBy: { select: { id: true, name: true, photoUrl: true, role: true } }
      }
    });

    res.status(201).json(task);
  } catch (error) {
    logger.error('Error creating task:', error);
    const { status, message } = handlePrismaError(error);
    res.status(status).json({ error: message });
  }
};

// Update task
export const updateTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, description, priority, status, dueDate, estimatedMinutes, notes } = req.body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (priority !== undefined) updateData.priority = priority;
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'COMPLETED') {
        updateData.completedAt = new Date();
      }
    }
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (estimatedMinutes !== undefined) updateData.estimatedMinutes = estimatedMinutes;
    if (notes !== undefined) updateData.notes = notes;

    const task = await prisma.task.update({
      where: { id: Number(id) },
      data: updateData,
      include: {
        assignedTo: { select: { id: true, name: true, photoUrl: true, role: true } },
        assignedBy: { select: { id: true, name: true, photoUrl: true, role: true } }
      }
    });

    res.json(task);
  } catch (error) {
    logger.error('Error updating task:', error);
    const { status, message } = handlePrismaError(error);
    res.status(status).json({ error: message });
  }
};

// Delete task
export const deleteTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.task.delete({
      where: { id: Number(id) }
    });

    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting task:', error);
    const { status, message } = handlePrismaError(error);
    res.status(status).json({ error: message });
  }
};

// Get user's tasks
export const getUserTasks = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { status, priority } = req.query;

    const where: any = { assignedToId: userId };
    if (status) where.status = status;
    if (priority) where.priority = priority;

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignedBy: { select: { id: true, name: true, photoUrl: true, role: true } }
      },
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    res.json(tasks);
  } catch (error) {
    logger.error('Error fetching user tasks:', error);
    const { status, message } = handlePrismaError(error);
    res.status(status).json({ error: message });
  }
};

// Get task analytics
export const getTaskAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, userId } = req.query;

    const where: any = {};
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }
    if (userId) where.assignedToId = Number(userId);

    const [
      totalTasks,
      completedTasks,
      overdueTasks,
      tasksByPriority,
      tasksByStatus
    ] = await Promise.all([
      prisma.task.count({ where }),
      prisma.task.count({ where: { ...where, status: 'COMPLETED' } }),
      prisma.task.count({
        where: {
          ...where,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
          dueDate: { lt: new Date() }
        }
      }),
      prisma.task.groupBy({
        by: ['priority'],
        where,
        _count: { priority: true }
      }),
      prisma.task.groupBy({
        by: ['status'],
        where,
        _count: { status: true }
      })
    ]);

    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    res.json({
      totalTasks,
      completedTasks,
      overdueTasks,
      completionRate: Math.round(completionRate * 100) / 100,
      tasksByPriority: tasksByPriority.reduce((acc: Record<string, number>, item: any) => {
        acc[item.priority] = item._count.priority;
        return acc;
      }, {} as Record<string, number>),
      tasksByStatus: tasksByStatus.reduce((acc: Record<string, number>, item: any) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {} as Record<string, number>)
    });
  } catch (error) {
    logger.error('Error fetching task analytics:', error);
    const { status, message } = handlePrismaError(error);
    res.status(status).json({ error: message });
  }
};