import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

const prisma = new PrismaClient().$extends(withAccelerate());

export const getRecentSales = async (req: Request, res: Response) => {
  try {
    const recentSales = await prisma.sale.findMany({
      take: 5,
      orderBy: { saleDate: 'desc' },
      include: { customer: true }
    });
    res.json(recentSales);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch recent sales' });
  }
}; 