import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import { getAppointmentProgress, getPartyProgress } from '../services/appointmentProgressService';

const prisma = new PrismaClient();

/**
 * Get appointment progress for a customer
 */
export const getCustomerProgress = async (req: Request, res: Response): Promise<void> => {
  try {
    const customerId = Number(req.params.customerId);
    
    if (isNaN(customerId)) {
      res.status(400).json({ error: 'Invalid customer ID' });
      return;
    }

    const progress = await getAppointmentProgress(customerId);
    
    if (!progress) {
      res.status(404).json({ error: 'Customer progress not found' });
      return;
    }

    res.json(progress);
  } catch (error: any) {
    logger.error('Error getting customer progress:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get appointment progress for a party member
 */
export const getPartyMemberProgress = async (req: Request, res: Response): Promise<void> => {
  try {
    const partyMemberId = Number(req.params.partyMemberId);
    
    if (isNaN(partyMemberId)) {
      res.status(400).json({ error: 'Invalid party member ID' });
      return;
    }

    const progress = await getAppointmentProgress(undefined, partyMemberId);
    
    if (!progress) {
      res.status(404).json({ error: 'Party member progress not found' });
      return;
    }

    res.json(progress);
  } catch (error: any) {
    logger.error('Error getting party member progress:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get progress for all members of a party
 */
export const getPartyProgressSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const partyId = Number(req.params.partyId);
    
    if (isNaN(partyId)) {
      res.status(400).json({ error: 'Invalid party ID' });
      return;
    }

    const progress = await getPartyProgress(partyId);
    res.json(progress);
  } catch (error: any) {
    logger.error('Error getting party progress:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get dashboard progress summary
 */
export const getProgressDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get overall progress statistics
    const stats = await prisma.$transaction(async (tx) => {
      // Count appointments by type and status
      const appointmentStats = await tx.appointment.groupBy({
        by: ['type', 'status'],
        _count: true
      });

      // Count customers with different progress levels
      const totalCustomers = await tx.customer.count();
      
      // Count parties and their progress
      const totalParties = await tx.party.count();
      
      // Get recent appointments
      const recentAppointments = await tx.appointment.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          party: true,
          member: true,
          individualCustomer: true,
          tailor: true
        }
      });

      // Get upcoming appointments
      const upcomingAppointments = await tx.appointment.findMany({
        where: {
          dateTime: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
          },
          status: {
            in: ['scheduled', 'confirmed']
          }
        },
        orderBy: { dateTime: 'asc' },
        include: {
          party: true,
          member: true,
          individualCustomer: true,
          tailor: true
        }
      });

      return {
        appointmentStats,
        totalCustomers,
        totalParties,
        recentAppointments,
        upcomingAppointments
      };
    });

    // Process appointment stats
    const processedStats = {
      appointments: {
        total: stats.appointmentStats.reduce((sum, stat) => sum + stat._count, 0),
        byType: stats.appointmentStats.reduce((acc, stat) => {
          if (!acc[stat.type || 'unknown']) {
            acc[stat.type || 'unknown'] = 0;
          }
          acc[stat.type || 'unknown'] += stat._count;
          return acc;
        }, {} as Record<string, number>),
        byStatus: stats.appointmentStats.reduce((acc, stat) => {
          if (!acc[stat.status]) {
            acc[stat.status] = 0;
          }
          acc[stat.status] += stat._count;
          return acc;
        }, {} as Record<string, number>)
      },
      customers: {
        total: stats.totalCustomers
      },
      parties: {
        total: stats.totalParties
      },
      recent: stats.recentAppointments,
      upcoming: stats.upcomingAppointments
    };

    res.json(processedStats);
  } catch (error: any) {
    logger.error('Error getting progress dashboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get overdue appointments
 */
export const getOverdueAppointments = async (req: Request, res: Response): Promise<void> => {
  try {
    const now = new Date();
    
    const overdueAppointments = await prisma.appointment.findMany({
      where: {
        dateTime: {
          lt: now
        },
        status: {
          in: ['scheduled', 'confirmed']
        }
      },
      include: {
        party: true,
        member: true,
        individualCustomer: true,
        tailor: true
      },
      orderBy: { dateTime: 'desc' }
    });

    res.json(overdueAppointments);
  } catch (error: any) {
    logger.error('Error getting overdue appointments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get appointments needing follow-up
 */
export const getAppointmentsNeedingFollowUp = async (req: Request, res: Response): Promise<void> => {
  try {
    // Find completed appointments that should have follow-up appointments scheduled
    const completedAppointments = await prisma.appointment.findMany({
      where: {
        status: 'completed',
        nextAppointmentId: null, // No follow-up scheduled
        type: {
          in: ['first_fitting', 'alterations_fitting'] // Types that should have follow-ups
        }
      },
      include: {
        party: true,
        member: true,
        individualCustomer: true,
        tailor: true
      },
      orderBy: { dateTime: 'desc' }
    });

    res.json(completedAppointments);
  } catch (error: any) {
    logger.error('Error getting appointments needing follow-up:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
