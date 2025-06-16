const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const requireAuth = require('../middleware/auth');
const { logChange } = require('../src/services/AuditLogService');

// GET /api/admin/settings
router.get('/', async (req, res) => {
  try {
    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

// POST /api/admin/settings
router.post('/', requireAuth, async (req, res) => {
  try {
    const { reminderIntervals, emailSubject, emailBody, smsBody } = req.body;
    const updated = await prisma.settings.update({
      where: { id: 1 },
      data: { reminderIntervals, emailSubject, emailBody, smsBody },
    });
    await logChange({
      user: req.user,
      action: 'update',
      entity: 'Settings',
      entityId: 1,
      details: { reminderIntervals, emailSubject, emailBody, smsBody },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// --- ALTERATION TASK TYPES ---
// GET /api/admin/task-types
router.get('/task-types', requireAuth, async (req, res) => {
  try {
    const types = await prisma.alterationTaskType.findMany();
    res.json(types);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load task types' });
  }
});
// POST /api/admin/task-types
router.post('/task-types', requireAuth, async (req, res) => {
  try {
    const { name, defaultDuration, parts } = req.body;
    const type = await prisma.alterationTaskType.create({ data: { name, defaultDuration, parts } });
    res.json(type);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create task type' });
  }
});
// PUT /api/admin/task-types/:id
router.put('/task-types/:id', requireAuth, async (req, res) => {
  try {
    const { name, defaultDuration, parts } = req.body;
    const type = await prisma.alterationTaskType.update({ where: { id: Number(req.params.id) }, data: { name, defaultDuration, parts } });
    res.json(type);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update task type' });
  }
});
// DELETE /api/admin/task-types/:id
router.delete('/task-types/:id', requireAuth, async (req, res) => {
  try {
    await prisma.alterationTaskType.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete task type' });
  }
});
// --- TAILOR ABILITIES ---
// GET /api/admin/tailor-abilities
router.get('/tailor-abilities', requireAuth, async (req, res) => {
  try {
    const abilities = await prisma.tailorAbility.findMany({ include: { tailor: true, taskType: true } });
    res.json(abilities);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load tailor abilities' });
  }
});
// POST /api/admin/tailor-abilities
router.post('/tailor-abilities', requireAuth, async (req, res) => {
  try {
    const { tailorId, taskTypeId, proficiency } = req.body;
    const ability = await prisma.tailorAbility.create({ data: { tailorId, taskTypeId, proficiency } });
    res.json(ability);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create tailor ability' });
  }
});
// PUT /api/admin/tailor-abilities/:id
router.put('/tailor-abilities/:id', requireAuth, async (req, res) => {
  try {
    const { proficiency } = req.body;
    const ability = await prisma.tailorAbility.update({ where: { id: Number(req.params.id) }, data: { proficiency } });
    res.json(ability);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update tailor ability' });
  }
});
// DELETE /api/admin/tailor-abilities/:id
router.delete('/tailor-abilities/:id', requireAuth, async (req, res) => {
  try {
    await prisma.tailorAbility.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete tailor ability' });
  }
});
// --- TAILOR SCHEDULES ---
// GET /api/admin/tailor-schedules
router.get('/tailor-schedules', requireAuth, async (req, res) => {
  try {
    const schedules = await prisma.tailorSchedule.findMany({ include: { tailor: true } });
    res.json(schedules);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load tailor schedules' });
  }
});
// POST /api/admin/tailor-schedules
router.post('/tailor-schedules', requireAuth, async (req, res) => {
  try {
    const { tailorId, dayOfWeek, startTime, endTime } = req.body;
    const schedule = await prisma.tailorSchedule.create({ data: { tailorId, dayOfWeek, startTime, endTime } });
    res.json(schedule);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create tailor schedule' });
  }
});
// PUT /api/admin/tailor-schedules/:id
router.put('/tailor-schedules/:id', requireAuth, async (req, res) => {
  try {
    const { dayOfWeek, startTime, endTime } = req.body;
    const schedule = await prisma.tailorSchedule.update({ where: { id: Number(req.params.id) }, data: { dayOfWeek, startTime, endTime } });
    res.json(schedule);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update tailor schedule' });
  }
});
// DELETE /api/admin/tailor-schedules/:id
router.delete('/tailor-schedules/:id', requireAuth, async (req, res) => {
  try {
    await prisma.tailorSchedule.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete tailor schedule' });
  }
});

module.exports = router; 