const express = require('express');
const prisma = require('../prismaClient');
const router = express.Router();
const requireAuth = require('../../backend/middleware/auth');
const { logChange } = require('../../backend/src/services/AuditLogService');

router.use(requireAuth);

// GET /api/users
router.get('/', async (req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, createdAt: true, updatedAt: true },
    orderBy: { name: 'asc' }
  });
  res.json(users);
});

// GET /api/users/:id
router.get('/:id', async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: Number(req.params.id) },
    select: { id: true, email: true, name: true, role: true, createdAt: true, updatedAt: true }
  });
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
});

// POST /api/users
router.post('/', async (req, res) => {
  const { email, passwordHash, name, role } = req.body;
  if (!email || !passwordHash || !name || !role) return res.status(400).json({ error: 'Missing required fields' });
  const user = await prisma.user.create({
    data: { email, passwordHash, name, role },
    select: { id: true, email: true, name: true, role: true, createdAt: true, updatedAt: true }
  });
  await logChange({
    user: req.user,
    action: 'create',
    entity: 'User',
    entityId: user.id,
    details: req.body,
  });
  res.status(201).json(user);
});

// PUT /api/users/:id
router.put('/:id', async (req, res) => {
  const { email, name, role } = req.body;
  const user = await prisma.user.update({
    where: { id: Number(req.params.id) },
    data: { email, name, role },
    select: { id: true, email: true, name: true, role: true, createdAt: true, updatedAt: true }
  });
  await logChange({
    user: req.user,
    action: 'update',
    entity: 'User',
    entityId: user.id,
    details: req.body,
  });
  res.json(user);
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
  const user = await prisma.user.delete({ where: { id: Number(req.params.id) } });
  await logChange({
    user: req.user,
    action: 'delete',
    entity: 'User',
    entityId: user.id,
    details: user,
  });
  res.json({ success: true });
});

// GET /api/saleassignments
router.get('/saleassignments', async (req, res) => {
  const assignments = await prisma.saleAssignment.findMany({
    include: { associate: true },
    orderBy: { createdAt: 'desc' }
  });
  res.json(assignments);
});

// POST /api/saleassignments
router.post('/saleassignments', async (req, res) => {
  const { saleId, associateId, commissionRate, amount } = req.body;
  if (!saleId || !associateId || commissionRate == null || amount == null) return res.status(400).json({ error: 'Missing required fields' });
  const assignment = await prisma.saleAssignment.create({
    data: { saleId, associateId, commissionRate, amount },
    include: { associate: true }
  });
  await logChange({
    user: req.user,
    action: 'create',
    entity: 'SaleAssignment',
    entityId: assignment.id,
    details: req.body,
  });
  // Simulate Lightspeed sync
  await logChange({
    user: req.user,
    action: 'sync',
    entity: 'SaleAssignment',
    entityId: assignment.id,
    details: { message: 'Synced to Lightspeed' },
  });
  res.status(201).json(assignment);
});

// PUT /api/saleassignments/:id
router.put('/saleassignments/:id', async (req, res) => {
  const { saleId, associateId, commissionRate, amount } = req.body;
  const assignment = await prisma.saleAssignment.update({
    where: { id: Number(req.params.id) },
    data: { saleId, associateId, commissionRate, amount },
    include: { associate: true }
  });
  await logChange({
    user: req.user,
    action: 'update',
    entity: 'SaleAssignment',
    entityId: assignment.id,
    details: req.body,
  });
  // Simulate Lightspeed sync
  await logChange({
    user: req.user,
    action: 'sync',
    entity: 'SaleAssignment',
    entityId: assignment.id,
    details: { message: 'Synced to Lightspeed' },
  });
  res.json(assignment);
});

// DELETE /api/saleassignments/:id
router.delete('/saleassignments/:id', async (req, res) => {
  await prisma.saleAssignment.delete({ where: { id: Number(req.params.id) } });
  await logChange({
    user: req.user,
    action: 'delete',
    entity: 'SaleAssignment',
    entityId: Number(req.params.id),
    details: { id: req.params.id },
  });
  // Simulate Lightspeed sync
  await logChange({
    user: req.user,
    action: 'sync',
    entity: 'SaleAssignment',
    entityId: Number(req.params.id),
    details: { message: 'Deleted from Lightspeed' },
  });
  res.json({ success: true });
});

// GET /api/commissions/leaderboard
router.get('/commissions/leaderboard', async (req, res) => {
  const leaderboard = await prisma.saleAssignment.groupBy({
    by: ['associateId'],
    _sum: { amount: true },
    orderBy: { _sum: { amount: 'desc' } },
  });
  // Join with user info
  const users = await prisma.user.findMany({
    where: { id: { in: leaderboard.map(l => l.associateId) } },
    select: { id: true, name: true, email: true }
  });
  const result = leaderboard.map(l => ({
    associate: users.find(u => u.id === l.associateId),
    totalCommission: l._sum.amount
  }));
  res.json(result);
});

module.exports = router; 