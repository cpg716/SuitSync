import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

const prisma = new PrismaClient().$extends(withAccelerate());

export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const totalParties = await prisma.party.count();
    const upcomingAppointments = await prisma.appointment.count({ where: { dateTime: { gte: new Date() } } });
    const pendingAlterations = await prisma.alterationJob.count({ where: { status: 'NOT_STARTED' } });
    // Compute top commission from real SaleAssignment data if present
    let topCommission = 0;
    try {
      const rows: any[] = await (prisma as any).saleAssignment.groupBy({ by: ['associateId'], _sum: { commissionRate: true } });
      if (Array.isArray(rows) && rows.length) {
        topCommission = Math.max(...rows.map((r: any) => (r?._sum?.commissionRate) || 0));
      }
    } catch {}
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