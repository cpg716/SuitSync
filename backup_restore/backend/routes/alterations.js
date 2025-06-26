const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const requireAuth = require('../middleware/auth');

// GET /api/alterations - list all jobs (admin/tailor)
router.get('/', requireAuth, async (req, res) => {
  try {
    const jobs = await prisma.alterationJob.findMany({
      include: {
        party: true,
        customer: true,
        tailor: true,
        jobParts: { include: { taskType: true, assignedTailor: true } },
      },
    });
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load alteration jobs' });
  }
});

// POST /api/alterations - create job with parts (auto-assign tailors)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { saleLineItemId, partyId, customerId, notes, status, timeSpentMinutes, measurements, parts, associateId } = req.body;
    // Create job
    const job = await prisma.alterationJob.create({
      data: {
        saleLineItemId,
        partyId,
        customerId,
        notes,
        status,
        timeSpentMinutes,
        measurements,
        jobParts: {
          create: parts.map(part => ({
            part: part.part,
            taskTypeId: part.taskTypeId,
            assignedTailorId: part.tailorId,
            duration: part.duration,
            status: part.status || 'pending',
            notes: part.workTypeNotes || '',
          })),
        },
      },
      include: { jobParts: true },
    });
    // TODO: Sync with Lightspeed API (custom field or note)
    res.json(job);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create alteration job' });
  }
});

// PUT /api/alterations/:id - update job (admin/tailor)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { notes, status, timeSpentMinutes, measurements } = req.body;
    const job = await prisma.alterationJob.update({
      where: { id: Number(req.params.id) },
      data: { notes, status, timeSpentMinutes, measurements },
    });
    // TODO: Sync with Lightspeed API
    res.json(job);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update alteration job' });
  }
});

// GET /api/alterations/:id - get job detail
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const job = await prisma.alterationJob.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        party: true,
        customer: true,
        tailor: true,
        jobParts: { include: { taskType: true, assignedTailor: true } },
      },
    });
    res.json(job);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load alteration job' });
  }
});

// PATCH /api/alterations/parts/:id - update a job part (tailor or admin)
router.patch('/parts/:id', requireAuth, async (req, res) => {
  try {
    const { assignedTailorId, status, scheduledTime, duration, notes } = req.body;
    const part = await prisma.alterationJobPart.update({
      where: { id: Number(req.params.id) },
      data: { assignedTailorId, status, scheduledTime, duration, notes },
    });
    // TODO: Sync with Lightspeed API if needed
    res.json(part);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update job part' });
  }
});

// GET /api/alterations/parts/for-tailor/:tailorId - get all parts assigned to a tailor
router.get('/parts/for-tailor/:tailorId', requireAuth, async (req, res) => {
  try {
    const parts = await prisma.alterationJobPart.findMany({
      where: { assignedTailorId: Number(req.params.tailorId) },
      include: { job: true, taskType: true },
    });
    res.json(parts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load job parts for tailor' });
  }
});

// Utility: Find available tailor for a task type and time
async function findAvailableTailor(taskTypeId, duration, preferredStart) {
  // 1. Find all tailors with ability for this task type
  const abilities = await prisma.tailorAbility.findMany({
    where: { taskTypeId, proficiency: { gte: 3 } },
    include: { tailor: true },
  });
  // 2. For each tailor, check their schedule and current assignments
  for (const ability of abilities) {
    const tailor = ability.tailor;
    // Find schedule for the preferred day
    const dayOfWeek = preferredStart ? new Date(preferredStart).getDay() : new Date().getDay();
    const schedule = await prisma.tailorSchedule.findFirst({
      where: { tailorId: tailor.id, dayOfWeek },
    });
    if (!schedule) continue;
    // Check for overlapping jobs (simplified: just count jobs for now)
    const assignedParts = await prisma.alterationJobPart.findMany({
      where: {
        assignedTailorId: tailor.id,
        scheduledTime: { gte: new Date(new Date().setHours(0,0,0,0)) },
        status: { in: ['pending', 'in_progress'] },
      },
    });
    // If tailor has less than 5 jobs for the day, consider available (tunable)
    if (assignedParts.length < 5) {
      return tailor.id;
    }
  }
  return null;
}

// POST /api/alterations/auto-assign/:id - re-run auto-assignment for a job
router.post('/auto-assign/:id', requireAuth, async (req, res) => {
  try {
    const job = await prisma.alterationJob.findUnique({
      where: { id: Number(req.params.id) },
      include: { jobParts: true },
    });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    const updates = [];
    for (const part of job.jobParts) {
      // Get task type for duration
      const taskType = await prisma.alterationTaskType.findUnique({ where: { id: part.taskTypeId } });
      const duration = taskType?.defaultDuration || 60;
      const tailorId = await findAvailableTailor(part.taskTypeId, duration, part.scheduledTime);
      updates.push(prisma.alterationJobPart.update({
        where: { id: part.id },
        data: { assignedTailorId: tailorId, duration },
      }));
    }
    await Promise.all(updates);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to auto-assign job' });
  }
});

module.exports = router; 