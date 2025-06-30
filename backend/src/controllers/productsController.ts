import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import logger from '../utils/logger';

const prisma = new PrismaClient().$extends(withAccelerate());

export const getProducts = async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { name: 'asc' }
    });
    res.status(200).json(products);
  } catch (error: any) {
    logger.error('Failed to get products:', error);
    res.status(500).json({ message: 'Failed to retrieve products.' });
  }
}; 