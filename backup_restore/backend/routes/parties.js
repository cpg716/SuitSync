const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const requireAuth = require('../middleware/auth');
const { logChange } = require('../src/services/AuditLogService');
const { WorkflowService } = require('../src/services/WorkflowService');

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

// POST /api/parties/:id/members - add member
router.post('/:id/members', requireAuth, async (req, res) => {
  try {
    const { lsCustomerId, role, notes, status, measurements } = req.body;
    const member = await prisma.partyMember.create({
      data: {
        partyId: Number(req.params.id),
        lsCustomerId,
        role,
        notes,
        status: status || 'Selected',
        measurements,
      },
    });
    res.status(201).json(member);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add party member' });
  }
});

// DELETE /api/parties/:id/members/:memberId - remove member
router.delete('/:id/members/:memberId', requireAuth, async (req, res) => {
  try {
    await prisma.partyMember.delete({ where: { id: Number(req.params.memberId) } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove party member' });
  }
});

// PUT /api/parties/:id/members/:memberId - edit member
router.put('/:id/members/:memberId', requireAuth, async (req, res) => {
  try {
    const { lsCustomerId, role, notes, status, measurements } = req.body;
    const member = await prisma.partyMember.update({
      where: { id: Number(req.params.memberId) },
      data: { lsCustomerId, role, notes, status, measurements },
    });
    res.json(member);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update party member' });
  }
});

// GET /api/parties/:id/timeline - get party workflow status/timeline
router.get('/:id/timeline', requireAuth, async (req, res) => {
  try {
    const party = await prisma.party.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        members: true,
        appointments: true,
        alterationJobs: true,
      },
    });
    if (!party) return res.status(404).json({ error: 'Party not found' });
    // Build a simple timeline/status tracker
    const timeline = party.members.map(member => ({
      memberId: member.id,
      name: member.lsCustomerId,
      role: member.role,
      status: member.status,
      appointments: party.appointments.filter(a => a.memberId === member.id),
      alterationJobs: party.alterationJobs.filter(j => j.partyMemberId === member.id),
    }));
    res.json({ partyId: party.id, name: party.name, eventDate: party.eventDate, timeline });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load party timeline' });
  }
});

// GET /api/parties/:id/communications - get all comm logs for party and members
router.get('/:id/communications', requireAuth, async (req, res) => {
  try {
    const partyId = Number(req.params.id);
    // Get all comm logs for this party or any of its members
    const members = await prisma.partyMember.findMany({ where: { partyId } });
    const memberCustomerIds = members.map(m => m.lsCustomerId).filter(Boolean);
    const logs = await prisma.communicationLog.findMany({
      where: {
        OR: [
          { partyId },
          { customerId: { in: memberCustomerIds.map(id => Number(id)).filter(id => !isNaN(id)) } },
        ],
      },
      orderBy: { sentAt: 'desc' },
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load communication log' });
  }
});

// POST /api/parties/:id/trigger-bulk-order
router.post('/:id/trigger-bulk-order', requireAuth, async (req, res) => {
  try {
    await WorkflowService.triggerBulkOrder(Number(req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to trigger bulk order' });
  }
});

// POST /api/parties/:id/members/:memberId/advance-status
router.post('/:id/members/:memberId/advance-status', requireAuth, async (req, res) => {
  try {
    const { newStatus } = req.body;
    await WorkflowService.advanceMemberStatus(Number(req.params.memberId), newStatus);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to advance member status' });
  }
});

// POST /api/parties/:id/members/:memberId/notify-pickup
router.post('/:id/members/:memberId/notify-pickup', requireAuth, async (req, res) => {
  try {
    const { pickupDate } = req.body;
    await WorkflowService.notifyReadyForPickup(Number(req.params.memberId), new Date(pickupDate));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send pickup notification' });
  }
});

// GET /api/parties/at-risk - list at-risk/overdue parties
router.get('/at-risk', requireAuth, async (req, res) => {
  try {
    const parties = await prisma.party.findMany({
      where: {
        notes: { contains: '[AT RISK]' },
      },
      include: { members: true, appointments: true, customer: true },
      orderBy: { eventDate: 'asc' },
    });
    res.json(parties);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load at-risk parties' });
  }
});

module.exports = router;