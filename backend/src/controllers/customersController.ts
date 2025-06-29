import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import { logChange } from '../services/AuditLogService';
import { createLightspeedClient } from '../lightspeedClient'; // TODO: migrate this as well
import AuditLogService from '../services/AuditLogService'; // TODO: migrate this as well
import { verifyAndGetCustomField, createOrUpdateCustomField, initialize as initializeWorkflow } from '../services/workflowService';
import { processWebhook } from '../services/webhookService';

const prisma = new PrismaClient().$extends(withAccelerate());
const DEMO = process.env.DEMO === 'true';

export const listLightspeedCustomers = async (req: Request, res: Response): Promise<void> => {
  if (!req.session?.lsAccessToken) {
    res.status(403).json({ 
      error: 'Not authenticated with Lightspeed. Please connect your account in Settings.',
      redirectTo: '/lightspeed-account' 
    });
    return;
  }
  try {
    const customers = await createLightspeedClient(req).getCustomers();
    res.json(customers);
  } catch (error: any) {
    console.error('Error fetching customers from Lightspeed:', error);
    res.status(500).json({ error: 'Failed to fetch customers from Lightspeed', details: error.message });
  }
};

export const listCustomers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, page = 1, limit = 10 } = req.query as any;
    const skip = (page - 1) * limit;
    let where = undefined;
    if (search) {
      where = {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
          { phone: { contains: search, mode: 'insensitive' as const } },
        ]
      };
    }
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { name: 'asc' },
        include: {
          measurements: true,
          parties: true
        }
      }),
      prisma.customer.count({ where })
    ]);
    res.json({
      customers,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        current: Number(page),
        limit: Number(limit)
      }
    });
  } catch (err) {
    console.error('Error listing customers:', err);
    res.status(500).json({ error: 'Failed to list customers' });
  }
};

export const getCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        measurements: true,
        parties: true,
        alterationJobs: true,
      }
    });
    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }
    res.json(customer);
  } catch (err) {
    console.error('Error getting customer:', err);
    res.status(500).json({ error: 'Failed to get customer' });
  }
};

export const createCustomer = async (req: Request, res: Response): Promise<void> => {
  const { name, email, phone } = req.body;
  const userId = (req as any).user.id;
  if (!name || !email) {
    res.status(400).json({ error: 'Name and email are required' });
    return;
  }
  try {
    const existingCustomer = await prisma.customer.findUnique({ where: { email } });
    if (existingCustomer) {
      res.status(409).json({ error: 'A customer with this email already exists in SuitSync.' });
      return;
    }
    const lightspeedClient = createLightspeedClient(req);
    const [firstName, ...lastNameParts] = name.split(' ');
    const lastName = lastNameParts.join(' ') || firstName;
    const customerData = {
      firstName: firstName,
      lastName: lastName,
      Contact: {
        Emails: {
          Email: [{ address: email, type: 'primary' }],
        },
        Phones: phone ? { Phone: [{ number: phone, type: 'mobile' }] } : undefined,
      },
    };
    const response = await lightspeedClient.post('/customers', customerData);
    if (!response) throw new Error('No response from Lightspeed');
    const lightspeedCustomer = response.data.Customer;
    const newCustomer = await prisma.customer.create({
      data: {
        lightspeedId: lightspeedCustomer.customerID.toString(),
        name: `${lightspeedCustomer.firstName || ''} ${lightspeedCustomer.lastName || ''}`.trim(),
        email: lightspeedCustomer.Contact.Emails.Email[0].address,
        phone: lightspeedCustomer.Contact.Phones?.Phone?.[0]?.number,
        lightspeedVersion: BigInt(lightspeedCustomer.version),
        syncedAt: new Date(),
      },
    });
    await AuditLogService.logAction(userId, 'CREATE', 'Customer', newCustomer.id, { lightspeedId: lightspeedCustomer.customerID, ...req.body });
    res.status(201).json(newCustomer);
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || 'Failed to create customer.';
    const errorDetails = error.response?.data?.error?.message || errorMessage;
    console.error('Error creating customer:', error.response?.data || error.message);
    const userId = (req as any).user?.id;
    if (userId) {
      await AuditLogService.logAction(userId, 'CREATE', 'Customer', null, { error: errorDetails, ...req.body });
    }
    res.status(error.response?.status || 500).json({ error: 'Failed to create customer in Lightspeed.', details: errorDetails });
  }
};

export const updateCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, phone } = req.body;
    const customerId = Number(req.params.id);
    const userId = (req as any).user.id;
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });
    if (!customer || !customer.lightspeedId) {
      res.status(404).json({ error: 'Customer not found or not synced with Lightspeed.' });
      return;
    }
    const lightspeedClient = createLightspeedClient(req);
    const [firstName, ...lastNameParts] = name.split(' ');
    const lastName = lastNameParts.join(' ') || firstName;
    const updatePayload = {
      firstName,
      lastName,
      version: customer.lightspeedVersion,
      Contact: {
        Emails: {
          Email: [{ address: email, type: 'primary' }],
        },
        Phones: phone ? { Phone: [{ number: phone, type: 'mobile' }] } : undefined,
      },
    };
    const response = await lightspeedClient.put(`/customers/${customer.lightspeedId}`, updatePayload);
    if (!response) throw new Error('No response from Lightspeed');
    const updatedLightspeedCustomer = response.data.Customer;
    const updatedCustomer = await prisma.customer.update({
      where: { id: customerId },
      data: {
        name: `${updatedLightspeedCustomer.firstName || ''} ${updatedLightspeedCustomer.lastName || ''}`.trim(),
        email: updatedLightspeedCustomer.Contact.Emails.Email[0].address,
        phone: updatedLightspeedCustomer.Contact.Phones?.Phone?.[0]?.number,
        lightspeedVersion: BigInt(updatedLightspeedCustomer.version),
        syncedAt: new Date(),
      },
    });
    await AuditLogService.logAction(userId, 'UPDATE', 'Customer', updatedCustomer.id, { lightspeedId: updatedCustomer.lightspeedId, ...req.body });
    res.json(updatedCustomer);
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || 'Failed to update customer.';
    const errorDetails = error.response?.data?.error?.message || errorMessage;
    console.error('Error updating customer:', error.response?.data || error.message);
    const userId = (req as any).user?.id;
    if (userId) {
      await AuditLogService.logAction(userId, 'UPDATE', 'Customer', Number(req.params.id), { error: errorDetails, ...req.body });
    }
    res.status(error.response?.status || 500).json({ error: 'Failed to update customer in Lightspeed.', details: errorDetails });
  }
};

export const getCustomerMeasurements = async (req: Request, res: Response): Promise<void> => {
  try {
    const measurements = await prisma.measurements.findUnique({
      where: { customerId: Number(req.params.id) }
    });
    res.json({ measurements });
  } catch (err) {
    console.error('Error getting measurements:', err);
    res.status(500).json({ error: 'Failed to get measurements' });
  }
};

export const updateCustomerMeasurements = async (req: Request, res: Response): Promise<void> => {
  try {
    const { measurements } = req.body;
    const customerId = Number(req.params.id);
    const updated = await prisma.measurements.upsert({
      where: { customerId },
      create: { ...measurements, customerId },
      update: measurements
    });
    await logChange({
      user: (req as any).user,
      action: 'update',
      entity: 'Measurements',
      entityId: customerId,
      details: measurements
    });
    res.json({ measurements: updated });
  } catch (err) {
    console.error('Error updating measurements:', err);
    res.status(500).json({ error: 'Failed to update measurements' });
  }
}; 