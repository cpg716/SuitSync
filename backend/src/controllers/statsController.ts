import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

const prisma = new PrismaClient().$extends(withAccelerate());

export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const totalParties = await prisma.party.count();
    const upcomingAppointments = await prisma.appointment.count({ where: { dateTime: { gte: new Date() } } });
    const pendingAlterations = await prisma.alterationJob.count({ where: { status: 'NOT_STARTED' } });
    // TODO: Implement real commission logic
    const topCommission = 500;
    res.json({
      totalParties,
      upcomingAppointments,
      pendingAlterations,
      topCommission,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
}; 