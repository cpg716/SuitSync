const prisma = require('../prismaClient');
const { logChange } = require('../src/services/AuditLogService');
const lightspeedClient = require('../lightspeedClient');
const { createCustomer, searchCustomers, getCustomer, updateCustomer } = require('../lightspeedClient');
const AuditLogService = require('../src/services/AuditLogService');

const DEMO = process.env.DEMO === 'true';

// List all customers from Lightspeed
exports.listLightspeedCustomers = async (req, res) => {
  if (!req.session?.lsAccessToken) {
    return res.status(403).json({ 
      error: 'Not authenticated with Lightspeed. Please connect your account in Settings.',
      redirectTo: '/lightspeed-account' 
    });
  }
  
  try {
    const customers = await lightspeedClient.getCustomers(req);
    res.json(customers);
  } catch (error) {
    console.error('Error fetching customers from Lightspeed:', error);
    res.status(500).json({ error: 'Failed to fetch customers from Lightspeed', details: error.message });
  }
};

// List all customers with pagination and search
exports.listCustomers = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const where = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ]
    } : {};

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

// Get single customer by ID
exports.getCustomer = async (req, res) => {
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
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(customer);
  } catch (err) {
    console.error('Error getting customer:', err);
    res.status(500).json({ error: 'Failed to get customer' });
  }
};

// Create new customer
exports.createCustomer = async (req, res) => {
  const { name, email, phone } = req.body;
  const userId = req.user.id;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  try {
    // 1. Check for existing customer in local DB
    const existingCustomer = await prisma.customer.findUnique({ where: { email } });
    if (existingCustomer) {
      return res.status(409).json({ error: 'A customer with this email already exists in SuitSync.' });
    }

    const lightspeedClient = require('../lightspeedClient').createLightspeedClient(req);

    // 2. Create customer in Lightspeed
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
    const lightspeedCustomer = response.data.Customer;

    // 3. Create customer in local DB using the response from Lightspeed
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
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Failed to create customer.';
    const errorDetails = error.response?.data?.error?.message || errorMessage;
    console.error('Error creating customer:', error.response?.data || error.message);
    
    const userId = req.user?.id;
    if (userId) {
      await AuditLogService.logAction(userId, 'CREATE', 'Customer', null, { error: errorDetails, ...req.body }, 'failed');
    }
    res.status(error.response?.status || 500).json({ error: 'Failed to create customer in Lightspeed.', details: errorDetails });
  }
};

// Update customer
exports.updateCustomer = async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const customerId = Number(req.params.id);
    const userId = req.user.id;

    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!customer || !customer.lightspeedId) {
      return res.status(404).json({ error: 'Customer not found or not synced with Lightspeed.' });
    }

    const lightspeedClient = require('../lightspeedClient').createLightspeedClient(req);
    const [firstName, ...lastNameParts] = name.split(' ');
    const lastName = lastNameParts.join(' ') || firstName;

    // Lightspeed's update endpoint requires the current version to prevent conflicts
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

    // Update in Lightspeed first
    const response = await lightspeedClient.put(`/customers/${customer.lightspeedId}`, updatePayload);
    const updatedLightspeedCustomer = response.data.Customer;

    // Update in local DB using the response from Lightspeed
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
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Failed to update customer.';
    const errorDetails = error.response?.data?.error?.message || errorMessage;
    console.error('Error updating customer:', error.response?.data || error.message);
    
    const userId = req.user?.id;
    if (userId) {
      await AuditLogService.logAction(userId, 'UPDATE', 'Customer', Number(req.params.id), { error: errorDetails, ...req.body }, 'failed');
    }
    res.status(error.response?.status || 500).json({ error: 'Failed to update customer in Lightspeed.', details: errorDetails });
  }
};

// Get customer measurements
exports.getCustomerMeasurements = async (req, res) => {
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

// Update customer measurements
exports.updateCustomerMeasurements = async (req, res) => {
  try {
    const { measurements } = req.body;
    const customerId = Number(req.params.id);

    const updated = await prisma.measurements.upsert({
      where: { customerId },
      create: { ...measurements, customerId },
      update: measurements
    });

    await logChange({
      user: req.user,
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