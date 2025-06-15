const express = require('express');
const prisma = require('../prismaClient');
const router = express.Router();

// router.use(requireAuth); // TEMP: Disabled for unauthenticated API testing

// GET /api/appointments
router.get('/', async (req, res) => {
  const appts = await prisma.appointment.findMany({
    include: { party: true, tailor: true },
    orderBy: { dateTime: 'asc' }
  });
  res.json(appts);
});

// GET /api/appointments/:id
router.get('/:id', async (req, res) => {
  const appt = await prisma.appointment.findUnique({
    where: { id: Number(req.params.id) },
    include: { party: true, tailor: true }
  });
  if (!appt) return res.status(404).json({ error: 'Not found' });
  res.json(appt);
});

// POST /api/appointments
router.post('/', async (req, res) => {
  const { partyId, dateTime, duration, tailorId, status, externalId } = req.body;
  if (!partyId || !dateTime) return res.status(400).json({ error: 'Missing required fields' });
  const appt = await prisma.appointment.create({
    data: { partyId, dateTime: new Date(dateTime), duration, tailorId, status, externalId },
  });
  await prisma.auditLog.create({
    data: { userId: req.session.userId, action: 'create', entity: 'Appointment', entityId: appt.id, details: JSON.stringify(appt) }
  });
  res.status(201).json(appt);
});

// PUT /api/appointments/:id
router.put('/:id', async (req, res) => {
  const { partyId, dateTime, duration, tailorId, status, externalId } = req.body;
  const appt = await prisma.appointment.update({
    where: { id: Number(req.params.id) },
    data: { partyId, dateTime: new Date(dateTime), duration, tailorId, status, externalId },
  });
  await prisma.auditLog.create({
    data: { userId: req.session.userId, action: 'update', entity: 'Appointment', entityId: appt.id, details: JSON.stringify(appt) }
  });
  res.json(appt);
});

// DELETE /api/appointments/:id
router.delete('/:id', async (req, res) => {
  const appt = await prisma.appointment.delete({ where: { id: Number(req.params.id) } });
  await prisma.auditLog.create({
    data: { userId: req.session.userId, action: 'delete', entity: 'Appointment', entityId: appt.id, details: JSON.stringify(appt) }
  });
  res.json({ success: true });
});

module.exports = router;