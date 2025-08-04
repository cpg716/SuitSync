import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import logger from '../utils/logger';

const prisma = new PrismaClient().$extends(withAccelerate());

export const getSuits = async (req: Request, res: Response): Promise<void> => {
  try {
    const suits = await prisma.weddingSuit.findMany({
      where: { isActive: true },
      orderBy: { vendor: 'asc', style: 'asc', color: 'asc' },
      include: {
        createdByUser: {
          select: { id: true, name: true }
        }
      }
    });

    res.json(suits);
  } catch (error) {
    logger.error('Error getting wedding suits:', error);
    res.status(500).json({ error: 'Failed to retrieve wedding suits' });
  }
};

export const getSuitById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const suit = await prisma.weddingSuit.findUnique({
      where: { id: parseInt(id) },
      include: {
        createdByUser: {
          select: { id: true, name: true }
        },
        partyMembers: {
          include: {
            party: {
              select: { id: true, name: true, eventDate: true }
            }
          }
        }
      }
    });

    if (!suit) {
      res.status(404).json({ error: 'Wedding suit not found' });
      return;
    }

    res.json(suit);
  } catch (error) {
    logger.error('Error getting wedding suit by ID:', error);
    res.status(500).json({ error: 'Failed to retrieve wedding suit' });
  }
};

export const createSuit = async (req: Request, res: Response): Promise<void> => {
  try {
    const { vendor, style, color, size, price, description } = req.body;
    const userId = (req as any).user?.id;

    if (!vendor || !style || !color || !size) {
      res.status(400).json({ error: 'Vendor, style, color, and size are required' });
      return;
    }

    const suit = await prisma.weddingSuit.create({
      data: {
        vendor,
        style,
        color,
        size,
        price: price ? parseFloat(price) : null,
        description,
        createdBy: userId,
        isActive: true
      },
      include: {
        createdByUser: {
          select: { id: true, name: true }
        }
      }
    });

    logger.info(`Wedding suit created: ${suit.id} by user ${userId}`);
    res.status(201).json(suit);
  } catch (error) {
    logger.error('Error creating wedding suit:', error);
    res.status(500).json({ error: 'Failed to create wedding suit' });
  }
};

export const updateSuit = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { vendor, style, color, size, price, description, isActive } = req.body;

    const existingSuit = await prisma.weddingSuit.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingSuit) {
      res.status(404).json({ error: 'Wedding suit not found' });
      return;
    }

    const suit = await prisma.weddingSuit.update({
      where: { id: parseInt(id) },
      data: {
        vendor,
        style,
        color,
        size,
        price: price ? parseFloat(price) : null,
        description,
        isActive: isActive !== undefined ? isActive : existingSuit.isActive
      },
      include: {
        createdByUser: {
          select: { id: true, name: true }
        }
      }
    });

    logger.info(`Wedding suit updated: ${suit.id}`);
    res.json(suit);
  } catch (error) {
    logger.error('Error updating wedding suit:', error);
    res.status(500).json({ error: 'Failed to update wedding suit' });
  }
};

export const deleteSuit = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existingSuit = await prisma.weddingSuit.findUnique({
      where: { id: parseInt(id) },
      include: {
        partyMembers: true
      }
    });

    if (!existingSuit) {
      res.status(404).json({ error: 'Wedding suit not found' });
      return;
    }

    // Check if suit is being used by any party members
    if (existingSuit.partyMembers.length > 0) {
      res.status(400).json({ 
        error: 'Cannot delete suit that is assigned to party members',
        partyMembersCount: existingSuit.partyMembers.length
      });
      return;
    }

    await prisma.weddingSuit.delete({
      where: { id: parseInt(id) }
    });

    logger.info(`Wedding suit deleted: ${id}`);
    res.json({ message: 'Wedding suit deleted successfully' });
  } catch (error) {
    logger.error('Error deleting wedding suit:', error);
    res.status(500).json({ error: 'Failed to delete wedding suit' });
  }
};

export const getSuitOptions = async (req: Request, res: Response): Promise<void> => {
  try {
    const suits = await prisma.weddingSuit.findMany({
      where: { isActive: true },
      select: {
        id: true,
        vendor: true,
        style: true,
        color: true,
        size: true,
        price: true
      },
      orderBy: [
        { vendor: 'asc' },
        { style: 'asc' },
        { color: 'asc' },
        { size: 'asc' }
      ]
    });

    // Group by vendor, style, color for dropdown options
    const options = suits.reduce((acc, suit) => {
      const key = `${suit.vendor} - ${suit.style} - ${suit.color}`;
      if (!acc[key]) {
        acc[key] = {
          label: key,
          vendor: suit.vendor,
          style: suit.style,
          color: suit.color,
          sizes: []
        };
      }
      acc[key].sizes.push({
        id: suit.id,
        size: suit.size,
        price: suit.price
      });
      return acc;
    }, {} as Record<string, any>);

    res.json(Object.values(options));
  } catch (error) {
    logger.error('Error getting suit options:', error);
    res.status(500).json({ error: 'Failed to retrieve suit options' });
  }
}; 