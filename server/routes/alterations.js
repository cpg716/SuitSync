const express = require('express');
const prisma = require('../prismaClient');
const router = express.Router();

// router.use(requireAuth); // TEMP: Disabled for unauthenticated API testing

// GET /api/alterations
router.get('/', async (req, res) => {
  const alterations = await prisma.alteration.findMany({
    include: { party: true, tailor: true },
    orderBy: { scheduledDateTime: 'asc' }
  });
  res.json(alterations);
});

// GET /api/alterations/:id
router.get('/:id', async (req, res) => {
  const alteration = await prisma.alteration.findUnique({
    where: { id: Number(req.params.id) },
    include: { party: true, tailor: true }
  });
  if (!alteration) return res.status(404).json({ error: 'Not found' });
  res.json(alteration);
});

// GET /api/alterations/skills
router.get('/skills', async (req, res) => {
  const skills = await prisma.skill.findMany({ orderBy: { name: 'asc' } });
  res.json(skills);
});

// GET /api/alterations/available-tailors?skill=SKILLNAME
router.get('/available-tailors', async (req, res) => {
  const skill = req.query.skill;
  if (!skill) return res.status(400).json({ error: 'Missing skill' });
  const tailors = await prisma.user.findMany({
    where: {
      role: 'tailor',
      skills: { some: { name: skill } },
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  });
  res.json(tailors);
});

// POST /api/alterations
router.post('/', async (req, res) => {
  const { partyId, notes, timeSpent, scheduledDateTime, tailorId, status, externalId, syncedAt, itemType, estimatedTime, actualTime } = req.body;
  if (!partyId || !itemType) return res.status(400).json({ error: 'Missing required fields' });
  // If tailorId is provided, check skill
  if (tailorId) {
    const tailor = await prisma.user.findUnique({
      where: { id: tailorId },
      include: { skills: true },
    });
    if (!tailor || !tailor.skills.some(s => s.name === itemType)) {
      return res.status(400).json({ error: 'Tailor does not have required skill' });
    }
  }
  const alteration = await prisma.alteration.create({
    data: { partyId, notes, timeSpent, scheduledDateTime: scheduledDateTime ? new Date(scheduledDateTime) : null, tailorId, status, externalId, syncedAt, itemType, estimatedTime, actualTime },
  });
  await prisma.auditLog.create({
    data: { userId: req.session.userId, action: 'create', entity: 'Alteration', entityId: alteration.id, details: JSON.stringify(alteration) }
  });
  res.status(201).json(alteration);
});

// PUT /api/alterations/:id
router.put('/:id', async (req, res) => {
  const { partyId, notes, timeSpent, scheduledDateTime, tailorId, status, externalId, syncedAt, itemType, estimatedTime, actualTime } = req.body;
  // If tailorId is provided, check skill
  if (tailorId) {
    const tailor = await prisma.user.findUnique({
      where: { id: tailorId },
      include: { skills: true },
    });
    if (!tailor || !tailor.skills.some(s => s.name === itemType)) {
      return res.status(400).json({ error: 'Tailor does not have required skill' });
    }
  }
  const alteration = await prisma.alteration.update({
    where: { id: Number(req.params.id) },
    data: { partyId, notes, timeSpent, scheduledDateTime: scheduledDateTime ? new Date(scheduledDateTime) : null, tailorId, status, externalId, syncedAt, itemType, estimatedTime, actualTime },
  });
  await prisma.auditLog.create({
    data: { userId: req.session.userId, action: 'update', entity: 'Alteration', entityId: alteration.id, details: JSON.stringify(alteration) }
  });
  res.json(alteration);
});

// DELETE /api/alterations/:id
router.delete('/:id', async (req, res) => {
  const alteration = await prisma.alteration.delete({ where: { id: Number(req.params.id) } });
  await prisma.auditLog.create({
    data: { userId: req.session.userId, action: 'delete', entity: 'Alteration', entityId: alteration.id, details: JSON.stringify(alteration) }
  });
  res.json({ success: true });
});

// POST /api/print/tag
router.post('/print/tag', async (req, res) => {
  const { jobId, format } = req.body;
  const job = await prisma.alteration.findUnique({
    where: { id: Number(jobId) },
    include: { party: true, tailor: true, member: true }
  });
  if (!job) return res.status(404).json({ error: 'Job not found' });
  if (format === 'zpl') {
    // Simple ZPL placeholder
    const zpl = `^XA^FO50,50^A0N,50,50^FDParty: ${job.party.name}^FS^FO50,120^A0N,40,40^FDJob: ${job.id}^FS^XZ`;
    return res.type('text/plain').send(zpl);
  } else {
    // Simple HTML placeholder
    const html = `<div><h2>Party: ${job.party.name}</h2><p>Job: ${job.id}</p></div>`;
    return res.type('text/html').send(html);
  }
});

// POST /api/print/batch
router.post('/print/batch', async (req, res) => {
  const { jobIds, format } = req.body;
  const jobs = await prisma.alteration.findMany({
    where: { id: { in: jobIds.map(Number) } },
    include: { party: true, tailor: true, member: true }
  });
  if (format === 'zpl') {
    const zpl = jobs.map(job => `^XA^FO50,50^A0N,50,50^FDParty: ${job.party.name}^FS^FO50,120^A0N,40,40^FDJob: ${job.id}^FS^XZ`).join('\n');
    return res.type('text/plain').send(zpl);
  } else {
    const html = jobs.map(job => `<div><h2>Party: ${job.party.name}</h2><p>Job: ${job.id}</p></div>`).join('');
    return res.type('text/html').send(html);
  }
});

module.exports = router;