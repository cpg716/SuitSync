import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

const prisma = new PrismaClient().$extends(withAccelerate());

export const listAuditLogs = async (req: Request, res: Response) => {
  const logs = await prisma.auditLog.findMany({
    include: { user: { select: { id: true, email: true, name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100
  });
  res.json(logs);
};

export const getAuditLog = async (req: Request, res: Response) => {
  const log = await prisma.auditLog.findUnique({
    where: { id: Number(req.params.id) },
    include: { user: { select: { id: true, email: true, name: true } } }
  });
  if (!log) return res.status(404).json({ error: 'Not found' });
  res.json(log);
}; 