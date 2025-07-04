import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, requirePermission } from '../middleware/auth';
import { lightspeedCustomFieldsService } from '../services/lightspeedCustomFieldsService';
import { asyncHandler } from '../utils/asyncHandler';
import logger from '../utils/logger';

const prisma = new PrismaClient();

const router = express.Router();

// Initialize custom fields in Lightspeed
router.post('/initialize-fields', authMiddleware, requirePermission('admin', 'write'), asyncHandler(async (req, res) => {
  try {
    await lightspeedCustomFieldsService.initializeCustomFields(req);
    res.json({ 
      success: true, 
      message: 'Successfully initialized SuitSync custom fields in Lightspeed' 
    });
  } catch (error: any) {
    logger.error('Error initializing Lightspeed custom fields:', error);
    res.status(500).json({ 
      error: 'Failed to initialize custom fields',
      details: error.message 
    });
  }
}));

// Sync specific customer to Lightspeed
router.post('/sync-customer/:customerId', authMiddleware, requirePermission('customers', 'write'), asyncHandler(async (req, res) => {
  try {
    const customerId = parseInt(req.params.customerId);
    await lightspeedCustomFieldsService.syncCustomerToLightspeed(req, customerId);
    res.json({ 
      success: true, 
      message: `Successfully synced customer ${customerId} to Lightspeed` 
    });
  } catch (error: any) {
    logger.error(`Error syncing customer ${req.params.customerId}:`, error);
    res.status(500).json({ 
      error: 'Failed to sync customer',
      details: error.message 
    });
  }
}));

// Bulk sync all customers to Lightspeed
router.post('/bulk-sync-customers', authMiddleware, requirePermission('admin', 'write'), asyncHandler(async (req, res) => {
  try {
    const result = await lightspeedCustomFieldsService.bulkSyncCustomersToLightspeed(req);
    res.json({ 
      success: true, 
      message: 'Bulk sync completed',
      result 
    });
  } catch (error: any) {
    logger.error('Error in bulk sync:', error);
    res.status(500).json({ 
      error: 'Failed to complete bulk sync',
      details: error.message 
    });
  }
}));

// Get sync status for a customer
router.get('/customer-status/:customerId', authMiddleware, requirePermission('customers', 'read'), asyncHandler(async (req, res) => {
  try {
    const customerId = parseInt(req.params.customerId);
    
    // Get customer with Lightspeed integration status
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        parties: {
          include: {
            appointments: {
              orderBy: { dateTime: 'asc' },
              where: { dateTime: { gte: new Date() } },
              take: 1
            }
          }
        },
        individualAppointments: {
          orderBy: { dateTime: 'asc' },
          where: { dateTime: { gte: new Date() } },
          take: 1
        },
        alterationJobs: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        measurements: true
      }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const nextAppointment = [
      ...(customer.parties?.flatMap(p => p.appointments) || []),
      ...(customer.individualAppointments || [])
    ].sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())[0];

    const syncStatus = {
      customerId: customer.id,
      lightspeedId: customer.lightspeedId,
      isLinked: !!customer.lightspeedId,
      nextAppointment: nextAppointment ? {
        id: nextAppointment.id,
        type: nextAppointment.type,
        dateTime: nextAppointment.dateTime
      } : null,
      measurementsStatus: customer.measurements ? 'Complete' : 'Not Taken',
      alterationStatus: customer.alterationJobs?.[0]?.status || 'Not Started',
      partyInfo: customer.parties?.[0] ? {
        name: customer.parties[0].name,
        eventDate: customer.parties[0].eventDate
      } : null
    };

    res.json(syncStatus);
  } catch (error: any) {
    logger.error(`Error getting sync status for customer ${req.params.customerId}:`, error);
    res.status(500).json({ 
      error: 'Failed to get sync status',
      details: error.message 
    });
  }
}));

export default router;