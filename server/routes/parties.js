const express = require('express');
const prisma = require('../prismaClient');
const router = express.Router();
const requireAuth = require('../../backend/middleware/auth');
const { logChange } = require('../../backend/src/services/AuditLogService');

// router.use(requireAuth); // TEMP: Disabled for unauthenticated API testing

router.use(requireAuth);

// GET /api/parties
router.get('/', async (req, res) => {
  const parties = await prisma.party.findMany({
    include: {
      customer: true,
      alterationJobs: true,
      appointments: true,
      members: true
    },
    orderBy: {
      eventDate: "asc"
    }
  });
  res.json(parties);
});

// GET /api/parties/:id
router.get('/:id', async (req, res) => {
  const party = await prisma.party.findUnique({
    where: { id: Number(req.params.id) },
    include: { customer: true, alterationJobs: true, appointments: true }
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

// GET /api/parties/:partyId/members/:memberId/measurements
router.get('/:partyId/members/:memberId/measurements', async (req, res) => {
  const memberId = Number(req.params.memberId);
  if (!memberId) return res.status(400).json({ error: 'Invalid member id' });
  const member = await prisma.partyMember.findUnique({ where: { id: memberId } });
  if (!member) return res.status(404).json({ error: 'Not found' });
  res.json({ measurements: member.measurements || {} });
});

// POST /api/parties
router.post('/', async (req, res) => {
  const { name, eventDate, customerId, externalId } = req.body;
  if (!name || !eventDate || !customerId) return res.status(400).json({ error: 'Missing required fields' });
  const party = await prisma.party.create({
    data: { name, eventDate: new Date(eventDate), customerId, externalId },
  });
  await logChange({
    user: req.user,
    action: 'create',
    entity: 'Party',
    entityId: party.id,
    details: req.body,
  });
  // Simulate Lightspeed sync
  await logChange({
    user: req.user,
    action: 'sync',
    entity: 'Party',
    entityId: party.id,
    details: { message: 'Synced to Lightspeed' },
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
  await logChange({
    user: req.user,
    action: 'create',
    entity: 'PartyMember',
    entityId: member.id,
    details: req.body,
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
  await logChange({
    user: req.user,
    action: 'update',
    entity: 'Party',
    entityId: party.id,
    details: req.body,
  });
  // Simulate Lightspeed sync
  await logChange({
    user: req.user,
    action: 'sync',
    entity: 'Party',
    entityId: party.id,
    details: { message: 'Synced to Lightspeed' },
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
  await logChange({
    user: req.user,
    action: 'update',
    entity: 'PartyMember',
    entityId: member.id,
    details: req.body,
  });
  res.json(member);
});

// PUT /api/parties/:partyId/members/:memberId/measurements
router.put('/:partyId/members/:memberId/measurements', async (req, res) => {
  const memberId = Number(req.params.memberId);
  if (!memberId) return res.status(400).json({ error: 'Invalid member id' });
  const { measurements, copyFromCustomer } = req.body;
  let newMeasurements = measurements;
  if (copyFromCustomer) {
    const member = await prisma.partyMember.findUnique({ where: { id: memberId } });
    if (!member || !member.lsCustomerId) return res.status(400).json({ error: 'No linked customer' });
    const customer = await prisma.customer.findUnique({ where: { id: Number(member.lsCustomerId) } });
    if (!customer || !customer.measurements) return res.status(400).json({ error: 'No measurements on customer' });
    newMeasurements = customer.measurements;
  }
  if (!newMeasurements || typeof newMeasurements !== 'object') return res.status(400).json({ error: 'Invalid measurements' });
  const updated = await prisma.partyMember.update({
    where: { id: memberId },
    data: { measurements: newMeasurements },
  });
  res.json({ measurements: updated.measurements });
});

// DELETE /api/parties/:id
router.delete('/:id', async (req, res) => {
  const party = await prisma.party.delete({ where: { id: Number(req.params.id) } });
  await logChange({
    user: req.user,
    action: 'delete',
    entity: 'Party',
    entityId: party.id,
    details: party,
  });
  // Simulate Lightspeed sync
  await logChange({
    user: req.user,
    action: 'sync',
    entity: 'Party',
    entityId: party.id,
    details: { message: 'Deleted from Lightspeed' },
  });
  res.json({ success: true });
});

// DELETE /api/parties/:id/members/:memberId
router.delete('/:id/members/:memberId', async (req, res) => {
  await prisma.partyMember.delete({ where: { id: Number(req.params.memberId) } });
  await logChange({
    user: req.user,
    action: 'delete',
    entity: 'PartyMember',
    entityId: Number(req.params.memberId),
    details: { memberId: req.params.memberId },
  });
  res.json({ success: true });
});

module.exports = router;