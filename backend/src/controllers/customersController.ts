import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import AuditLogService, { logChange } from '../services/AuditLogService';
import { createLightspeedClient } from '../lightspeedClient'; // TODO: migrate this as well
// duplicate import removed
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

// listCustomers
// Supports fuzzy search by first/last/email and normalized phone number (digits only),
// including partial matches. Paginates results.
export const listCustomers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, page = 1, limit = 10 } = req.query as any;
    const skip = (page - 1) * limit;
    let customers, total;
    if (search) {
      const norm = String(search).replace(/[^0-9a-zA-Z@\.\s]/g, '');
      const phoneDigits = norm.replace(/\D/g, '');
      const phoneLike = phoneDigits.length > 0 ? `%${phoneDigits}%` : null;
      const textLike = `%${norm}%`;
      customers = await prisma.$queryRawUnsafe(
        `SELECT *,
          CASE WHEN last_name IS NULL OR TRIM(last_name) = '' THEN 1 ELSE 0 END AS missing_last,
          CONCAT_WS(', ', NULLIF(TRIM(last_name), ''), NULLIF(TRIM(first_name), '')) AS display_name
        FROM "Customer"
        WHERE first_name ILIKE $1
           OR last_name ILIKE $1
           OR email ILIKE $1
           OR CONCAT_WS(' ', COALESCE(first_name,''), COALESCE(last_name,'')) ILIKE $1
           OR CONCAT_WS(' ', COALESCE(last_name,''), COALESCE(first_name,'')) ILIKE $1
           OR REGEXP_REPLACE(COALESCE(phone,''), '\\D', '', 'g') ILIKE COALESCE($4, '_____NO_PHONE____')
        ORDER BY missing_last ASC, LOWER(last_name) NULLS LAST, LOWER(first_name) NULLS LAST
        LIMIT $2 OFFSET $3;`,
        textLike, Number(limit), Number(skip), phoneLike
      );
      const countResult = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*) FROM "Customer"
         WHERE first_name ILIKE $1
            OR last_name ILIKE $1
            OR email ILIKE $1
            OR CONCAT_WS(' ', COALESCE(first_name,''), COALESCE(last_name,'')) ILIKE $1
            OR CONCAT_WS(' ', COALESCE(last_name,''), COALESCE(first_name,'')) ILIKE $1
            OR REGEXP_REPLACE(COALESCE(phone,''), '\\D', '', 'g') ILIKE COALESCE($2, '_____NO_PHONE____');`,
        textLike, phoneLike
      ) as Array<{ count: string }>;
      total = parseInt(countResult[0].count, 10);
    } else {
      customers = await prisma.$queryRawUnsafe(
        `SELECT *,
          CASE WHEN last_name IS NULL OR TRIM(last_name) = '' THEN 1 ELSE 0 END AS missing_last,
          CONCAT_WS(', ', NULLIF(TRIM(last_name), ''), NULLIF(TRIM(first_name), '')) AS display_name
        FROM "Customer"
        ORDER BY missing_last ASC, LOWER(last_name) NULLS LAST, LOWER(first_name) NULLS LAST
        LIMIT $1 OFFSET $2;`,
        Number(limit), Number(skip)
      );
      const countResult = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*) FROM "Customer";`
      ) as Array<{ count: string }>;
      total = parseInt(countResult[0].count, 10);
    }
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
    const id = Number(req.params.id);
    const customer = await prisma.customer.findUnique({ where: { id }, include: { measurements: true } });
    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }
    const lsId = customer.lightspeedId;
    const [appointments, alterationJobs, parties] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          OR: [
            { individualCustomerId: id },
            { member: { lsCustomerId: lsId } }
          ]
        },
        include: { party: true, tailor: true, member: true }
      }),
      prisma.alterationJob.findMany({
        where: {
          OR: [
            { customerId: id },
            { partyMember: { lsCustomerId: lsId } }
          ]
        },
        include: { party: true, tailor: true, partyMember: true }
      }),
      prisma.party.findMany({
        where: {
          OR: [
            { customerId: id },
            { members: { some: { lsCustomerId: lsId } } }
          ]
        },
        include: { members: true, appointments: true, alterationJobs: true }
      })
    ]);
    res.json({
      ...customer,
      appointments,
      alterations: alterationJobs,
      parties,
    });
  } catch (err) {
    console.error('Error getting customer:', err);
    res.status(500).json({ error: 'Failed to get customer' });
  }
};

export const createCustomer = async (req: Request, res: Response): Promise<void> => {
  const { name, email, phone } = req.body;
  const userId = (req as any).user.id;
  if (!name) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }
  try {
    const lightspeedClient = createLightspeedClient(req);
    const [firstName, ...lastNameParts] = name.split(' ');
    const lastName = lastNameParts.join(' ') || firstName;
    const customerData = {
      firstName: firstName,
      lastName: lastName,
      Contact: {
        Emails: {
          Email: [{ address: email || 'N/A', type: 'primary' }],
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
        email: lightspeedCustomer.Contact.Emails.Email[0].address || 'N/A',
        phone: lightspeedCustomer.Contact.Phones?.Phone?.[0]?.number || 'N/A',
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