const express = require('express');
const prisma = require('../prismaClient');
const router = express.Router();

// Middleware: require session auth (stub, replace with real check)
function requireAuth(req, res, next) {
  // TODO: Replace with real session check
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// router.use(requireAuth); // TEMP: Disabled for unauthenticated API testing

// GET /api/parties
router.get('/', async (req, res) => {
  const parties = await prisma.party.findMany({
    include: { customer: true, alterations: true, appointments: true },
    orderBy: { eventDate: 'asc' }
  });
  res.json(parties);
});

// GET /api/parties/:id
router.get('/:id', async (req, res) => {
  const party = await prisma.party.findUnique({
    where: { id: Number(req.params.id) },
    include: { customer: true, alterations: true, appointments: true }
  });
  if (!party) return res.status(404).json({ error: 'Not found' });
  res.json(party);
});

// GET /api/parties/:id/members
router.get('/:id/members', async (req, res) => {
  const members = await prisma.partyMember.findMany({
    where: { partyId: Number(req.params.id) },
    orderBy: { id: 'asc' }
  });
  res.json(members);
});

// POST /api/parties
router.post('/', async (req, res) => {
  const { name, eventDate, customerId, externalId } = req.body;
  if (!name || !eventDate || !customerId) return res.status(400).json({ error: 'Missing required fields' });
  const party = await prisma.party.create({
    data: { name, eventDate: new Date(eventDate), customerId, externalId },
  });
  await prisma.auditLog.create({
    data: { userId: req.session.userId, action: 'create', entity: 'Party', entityId: party.id, details: JSON.stringify(party) }
  });
  res.status(201).json(party);
});

// POST /api/parties/:id/members
router.post('/:id/members', async (req, res) => {
  const { lsCustomerId, role, measurements, notes, status } = req.body;
  if (!role) return res.status(400).json({ error: 'Missing required fields' });
  const member = await prisma.partyMember.create({
    data: {
      partyId: Number(req.params.id),
      lsCustomerId,
      role,
      measurements,
      notes,
      status: status || 'Selected',
    },
  });
  res.status(201).json(member);
});

// PUT /api/parties/:id
router.put('/:id', async (req, res) => {
  const { name, eventDate, customerId, externalId } = req.body;
  const party = await prisma.party.update({
    where: { id: Number(req.params.id) },
    data: { name, eventDate: new Date(eventDate), customerId, externalId },
  });
  await prisma.auditLog.create({
    data: { userId: req.session.userId, action: 'update', entity: 'Party', entityId: party.id, details: JSON.stringify(party) }
  });
  res.json(party);
});

// PUT /api/parties/:id/members/:memberId
router.put('/:id/members/:memberId', async (req, res) => {
  const { lsCustomerId, role, measurements, notes, status } = req.body;
  const member = await prisma.partyMember.update({
    where: { id: Number(req.params.memberId) },
    data: { lsCustomerId, role, measurements, notes, status },
  });
  res.json(member);
});

// DELETE /api/parties/:id
router.delete('/:id', async (req, res) => {
  const party = await prisma.party.delete({ where: { id: Number(req.params.id) } });
  await prisma.auditLog.create({
    data: { userId: req.session.userId, action: 'delete', entity: 'Party', entityId: party.id, details: JSON.stringify(party) }
  });
  res.json({ success: true });
});

// DELETE /api/parties/:id/members/:memberId
router.delete('/:id/members/:memberId', async (req, res) => {
  await prisma.partyMember.delete({ where: { id: Number(req.params.memberId) } });
  res.json({ success: true });
});

module.exports = router;