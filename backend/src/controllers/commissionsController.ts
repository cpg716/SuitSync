import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

const prisma = new PrismaClient().$extends(withAccelerate());

export const getLeaderboard = async (req: Request, res: Response) => {
  try {
    const associates = await prisma.user.findMany({
      where: {
        OR: [
          { role: 'associate' },
          { role: 'sales' },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        saleAssignments: true,
      },
    });
    const leaderboard = associates.map(a => {
      const totalSales = a.saleAssignments.reduce((sum, sa) => sum + (sa.amount || 0), 0);
      const totalCommission = a.saleAssignments.reduce((sum, sa) => sum + ((sa.amount || 0) * (sa.commissionRate || 0)), 0);
      return {
        associate: {
          id: a.id,
          name: a.name,
          email: a.email,
          role: a.role,
        },
        totalSales,
        totalCommission,
      };
    });
    leaderboard.sort((a, b) => b.totalSales - a.totalSales);
    res.json(leaderboard);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load sales leaderboard' });
  }
};

export const getAllCommissions = async (req: Request, res: Response) => {
  const { month } = req.query as { month?: string };
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: 'Invalid month format. Use YYYY-MM' });
  }
  const [year, m] = month.split('-');
  const start = new Date(Number(year), Number(m) - 1, 1);
  const end = new Date(Number(year), Number(m), 1);
  try {
    const assignments = await prisma.saleAssignment.findMany({
      where: {
        createdAt: { gte: start, lt: end },
      },
      include: { associate: true },
    });
    const grouped: any = {};
    for (const a of assignments) {
      if (!grouped[a.associateId]) {
        grouped[a.associateId] = {
          associate: a.associate,
          commission: 0,
          salesTotal: 0,
        };
      }
      grouped[a.associateId].commission += a.amount * a.commissionRate;
      grouped[a.associateId].salesTotal += a.amount;
    }
    res.json(Object.values(grouped));
  } catch (err) {
    res.status(500).json({ error: 'Failed to load commissions' });
  }
};

export const getMyCommissions = async (req: Request, res: Response) => {
  const { month } = req.query as { month?: string };
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: 'Invalid month format. Use YYYY-MM' });
  }
  const [year, m] = month.split('-');
  const start = new Date(Number(year), Number(m) - 1, 1);
  const end = new Date(Number(year), Number(m), 1);
  try {
    const assignments = await prisma.saleAssignment.findMany({
      where: {
        associateId: (req as any).user.id,
        createdAt: { gte: start, lt: end },
      },
    });
    res.json(assignments.map(a => ({
      saleId: a.saleId,
      amount: a.amount,
      commission: a.amount * a.commissionRate,
    })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to load your commissions' });
  }
}; 