const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const requireAuth = require('../middleware/auth');
const { logChange } = require('../src/services/AuditLogService');

// POST /api/parties - create Party + Lightspeed Customer tag
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, eventDate, notes } = req.body;
    const party = await prisma.party.create({
      data: { name, eventDate, notes },
    });
    await logChange({
      user: req.user,
      action: 'create',
      entity: 'Party',
      entityId: party.id,
      details: { name, eventDate, notes },
    });
    // Simulate Lightspeed sync (replace with real API call)
    // const lsResult = await syncWithLightspeed(party);
    await logChange({
      user: req.user,
      action: 'sync',
      entity: 'Party',
      entityId: party.id,
      details: { message: 'Synced to Lightspeed' },
    });
    res.status(201).json(party);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create party' });
  }
});

// GET /api/parties - list parties (with member counts)
router.get('/', requireAuth, async (req, res) => {
  try {
    const parties = await prisma.party.findMany({
      include: { members: true },
    });
    const result = parties.map(p => ({
      ...p,
      memberCount: p.members.length,
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load parties' });
  }
});

// GET /api/parties/:id - full party detail
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const party = await prisma.party.findUnique({
      where: { id: Number(req.params.id) },
      include: { members: true, appointments: true, jobs: true },
    });
    if (!party) return res.status(404).json({ error: 'Party not found' });
    res.json(party);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load party detail' });
  }
});

module.exports = router;