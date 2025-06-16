const express = require('express');
const prisma = require('../prismaClient');
const router = express.Router();
const { withTokenRefresh, getLightspeedApi } = require('../lightspeedClient');
const requireAuth = require('../../backend/middleware/auth');
const { logChange } = require('../../backend/src/services/AuditLogService');

router.use(requireAuth);

// GET /api/appointments
router.get('/', async (req, res) => {
  const { startDate, endDate, partyId, customerId, status, type } = req.query;
  const where = {};
  if (startDate && endDate) where.dateTime = { gte: new Date(startDate), lte: new Date(endDate) };
  if (partyId) where.partyId = Number(partyId);
  if (customerId) where.customerId = customerId;
  if (status) where.status = status;
  if (type) where.type = type;
  const appts = await prisma.appointment.findMany({
    where,
    include: { party: true, tailor: true, member: true, syncLogs: true },
    orderBy: { dateTime: 'asc' }
  });
  res.json(appts);
});

// GET /api/appointments/:id
router.get('/:id', async (req, res) => {
  const appt = await prisma.appointment.findUnique({
    where: { id: Number(req.params.id) },
    include: { party: true, tailor: true, member: true, syncLogs: true }
  });
  if (!appt) return res.status(404).json({ error: 'Not found' });
  res.json(appt);
});

// POST /api/appointments
router.post('/', async (req, res) => {
  try {
    const { partyId, customerId, saleId, dateTime, durationMinutes, type, notes, status, recurrenceRule, parentId, tailorId, memberId } = req.body;
    if (!partyId || !customerId || !dateTime) return res.status(400).json({ error: 'Missing required fields' });
    // Conflict prevention: check for overlapping appts for this customer/tailor
    const overlap = await prisma.appointment.findFirst({
      where: {
        customerId,
        dateTime: { lte: new Date(new Date(dateTime).getTime() + (durationMinutes || 60) * 60000), gte: new Date(dateTime) },
        status: { in: ['scheduled', 'rescheduled'] },
      }
    });
    if (overlap) return res.status(409).json({ error: 'Conflicting appointment exists' });
    // Create appointment
    const appt = await prisma.appointment.create({
      data: { partyId, customerId, saleId, dateTime: new Date(dateTime), durationMinutes, type, notes, status, recurrenceRule, parentId, tailorId, memberId },
      include: { party: true, tailor: true, member: true, syncLogs: true }
    });
    // Push to Lightspeed
    let syncStatus = 'success', syncMessage = 'Synced to Lightspeed';
    try {
      await withTokenRefresh(req, async (accessToken) => {
        const api = getLightspeedApi(accessToken);
        if (saleId) {
          await api.post(`/Sales/${saleId}/customFields`, { field: 'next_fitting_date', value: dateTime });
        }
      });
      await prisma.appointment.update({ where: { id: appt.id }, data: { syncedToLightspeed: true } });
    } catch (err) {
      syncStatus = 'failed';
      syncMessage = err.message;
      await prisma.appointment.update({ where: { id: appt.id }, data: { syncedToLightspeed: false } });
    }
    await logChange({
      user: req.user,
      action: 'create',
      entity: 'Appointment',
      entityId: appt.id,
      details: req.body,
    });
    await logChange({
      user: req.user,
      action: 'sync',
      entity: 'Appointment',
      entityId: appt.id,
      details: { message: syncMessage, status: syncStatus },
    });
    await prisma.syncLog.create({
      data: { appointmentId: appt.id, direction: 'outbound', status: syncStatus, message: syncMessage, payload: req.body }
    });
    res.status(201).json(appt);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/appointments/:id
router.put('/:id', async (req, res) => {
  try {
    const { dateTime, durationMinutes, type, notes, status, recurrenceRule, tailorId, memberId, saleId } = req.body;
    const appt = await prisma.appointment.update({
      where: { id: Number(req.params.id) },
      data: { dateTime: new Date(dateTime), durationMinutes, type, notes, status, recurrenceRule, tailorId, memberId, saleId },
      include: { party: true, tailor: true, member: true, syncLogs: true }
    });
    // Push update to Lightspeed
    let syncStatus = 'success', syncMessage = 'Updated in Lightspeed';
    try {
      await withTokenRefresh(req, async (accessToken) => {
        const api = getLightspeedApi(accessToken);
        if (saleId) {
          await api.post(`/Sales/${saleId}/customFields`, { field: 'next_fitting_date', value: dateTime });
        }
      });
      await prisma.appointment.update({ where: { id: appt.id }, data: { syncedToLightspeed: true } });
    } catch (err) {
      syncStatus = 'failed';
      syncMessage = err.message;
      await prisma.appointment.update({ where: { id: appt.id }, data: { syncedToLightspeed: false } });
    }
    await logChange({
      user: req.user,
      action: 'update',
      entity: 'Appointment',
      entityId: appt.id,
      details: req.body,
    });
    await logChange({
      user: req.user,
      action: 'sync',
      entity: 'Appointment',
      entityId: appt.id,
      details: { message: syncMessage, status: syncStatus },
    });
    await prisma.syncLog.create({
      data: { appointmentId: appt.id, direction: 'outbound', status: syncStatus, message: syncMessage, payload: req.body }
    });
    res.json(appt);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/appointments/:id
router.delete('/:id', async (req, res) => {
  try {
    const appt = await prisma.appointment.delete({ where: { id: Number(req.params.id) } });
    // Remove from Lightspeed
    let syncStatus = 'success', syncMessage = 'Canceled in Lightspeed';
    try {
      await withTokenRefresh(req, async (accessToken) => {
        const api = getLightspeedApi(accessToken);
        if (appt.saleId) {
          await api.post(`/Sales/${appt.saleId}/customFields`, { field: 'next_fitting_date', value: null });
        }
      });
    } catch (err) {
      syncStatus = 'failed';
      syncMessage = err.message;
    }
    await logChange({
      user: req.user,
      action: 'delete',
      entity: 'Appointment',
      entityId: appt.id,
      details: appt,
    });
    await logChange({
      user: req.user,
      action: 'sync',
      entity: 'Appointment',
      entityId: appt.id,
      details: { message: syncMessage, status: syncStatus },
    });
    await prisma.syncLog.create({
      data: { appointmentId: appt.id, direction: 'outbound', status: syncStatus, message: syncMessage, payload: appt }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;