const express = require('express');
const prisma = require('../prismaClient');
const router = express.Router();

// TEMP: Disabled for unauthenticated API testing
// function requireAuth(req, res, next) {
//   if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
//   next();
// }

// TEMP: Disabled for unauthenticated API testing
// router.use(requireAuth);

// GET /api/customers
router.get('/', async (req, res) => {
  const customers = await prisma.customer.findMany({
    include: { parties: true },
    orderBy: { name: 'asc' }
  });
  res.json(customers);
});

// GET /api/customers/:id
router.get('/:id', async (req, res) => {
  const customer = await prisma.customer.findUnique({
    where: { id: Number(req.params.id) },
    include: { parties: true }
  });
  if (!customer) return res.status(404).json({ error: 'Not found' });
  res.json(customer);
});

// GET /api/customers/:id/measurements
router.get('/:id/measurements', async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid customer id' });
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) return res.status(404).json({ error: 'Not found' });
  res.json({ measurements: customer.measurements || {} });
});

// POST /api/customers
router.post('/', async (req, res) => {
  const { name, email, phone } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Missing required fields' });
  const customer = await prisma.customer.create({
    data: { name, email, phone },
  });
  await prisma.auditLog.create({
    data: { userId: req.session.userId, action: 'create', entity: 'Customer', entityId: customer.id, details: JSON.stringify(customer) }
  });
  res.status(201).json(customer);
});

// PUT /api/customers/:id
router.put('/:id', async (req, res) => {
  const { name, email, phone } = req.body;
  const customer = await prisma.customer.update({
    where: { id: Number(req.params.id) },
    data: { name, email, phone },
  });
  await prisma.auditLog.create({
    data: { userId: req.session.userId, action: 'update', entity: 'Customer', entityId: customer.id, details: JSON.stringify(customer) }
  });
  res.json(customer);
});

// PUT /api/customers/:id/measurements
router.put('/:id/measurements', async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid customer id' });
  const { measurements } = req.body;
  if (!measurements || typeof measurements !== 'object') return res.status(400).json({ error: 'Invalid measurements' });
  const customer = await prisma.customer.update({
    where: { id },
    data: { measurements },
  });
  res.json({ measurements: customer.measurements });
});

// DELETE /api/customers/:id
router.delete('/:id', async (req, res) => {
  const customer = await prisma.customer.delete({ where: { id: Number(req.params.id) } });
  await prisma.auditLog.create({
    data: { userId: req.session.userId, action: 'delete', entity: 'Customer', entityId: customer.id, details: JSON.stringify(customer) }
  });
  res.json({ success: true });
});

module.exports = router; 