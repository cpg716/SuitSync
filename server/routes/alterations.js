const express = require('express');
const prisma = require('../prismaClient');
const router = express.Router();
const requireAuth = require('../../backend/middleware/auth');
const { logChange } = require('../../backend/src/services/AuditLogService');
const axios = require('axios');

router.use(requireAuth);

// GET /api/alterations
router.get('/', async (req, res) => {
  const { partyId, customerId, status } = req.query;
  const where = {};
  if (partyId) where.partyId = Number(partyId);
  if (customerId) where.customerId = Number(customerId);
  if (status) where.status = status;
  const jobs = await prisma.alterationJob.findMany({
    where,
    include: { party: true, customer: true, tailor: true },
    orderBy: { createdAt: 'desc' }
  });
  res.json(jobs);
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

// GET /api/alterations/:id
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!id || isNaN(id)) return res.status(400).json({ error: 'Invalid alteration id' });
  const job = await prisma.alterationJob.findUnique({
    where: { id },
    include: { party: true, customer: true, tailor: true }
  });
  if (!job) return res.status(404).json({ error: 'Not found' });
  res.json(job);
});

// POST /api/alterations
router.post('/', async (req, res) => {
  const { saleLineItemId, partyId, customerId, notes, status, timeSpentMinutes, tailorId, measurements } = req.body;
  if (!saleLineItemId) return res.status(400).json({ error: 'Missing saleLineItemId' });
  if (!partyId && !customerId) return res.status(400).json({ error: 'Must provide either partyId or customerId' });
  // Validate saleLineItemId exists in mirrored Sale (TODO: implement real check)
  // const saleLineItem = await prisma.saleLineItem.findUnique({ where: { id: saleLineItemId } });
  // if (!saleLineItem) return res.status(400).json({ error: 'Invalid saleLineItemId' });
  const job = await prisma.alterationJob.create({
    data: { saleLineItemId, partyId, customerId, notes, status, timeSpentMinutes, tailorId, measurements },
    include: { party: true, customer: true, tailor: true }
  });
  await logChange({ user: req.user, action: 'create', entity: 'AlterationJob', entityId: job.id, details: req.body });
  // Sync to Lightspeed custom field
  try {
    // TODO: Replace with real saleId lookup
    const saleId = 1; // placeholder
    await axios.patch(
      `${process.env.LS_API_BASE}/Sale/${saleId}/SaleLineItem/${saleLineItemId}.json`,
      { saleLineItem: { custom_fields: { alteration_notes: notes } } },
      { headers: { Authorization: `Bearer ${req.session?.lsAccessToken}` } }
    );
  } catch (err) {
    // Log but do not fail
    await logChange({ user: req.user, action: 'sync-fail', entity: 'AlterationJob', entityId: job.id, details: { error: err.message } });
  }
  res.status(201).json(job);
});

// PATCH /api/alterations/:id
router.patch('/:id', async (req, res) => {
  const { status, timeSpentMinutes, notes, tailorId, measurements } = req.body;
  const job = await prisma.alterationJob.update({
    where: { id: Number(req.params.id) },
    data: { status, timeSpentMinutes, notes, tailorId, measurements },
    include: { party: true, customer: true, tailor: true }
  });
  await logChange({ user: req.user, action: 'update', entity: 'AlterationJob', entityId: job.id, details: req.body });
  // Sync to Lightspeed custom field
  try {
    // TODO: Replace with real saleId lookup
    const saleId = 1; // placeholder
    await axios.patch(
      `${process.env.LS_API_BASE}/Sale/${saleId}/SaleLineItem/${job.saleLineItemId}.json`,
      { saleLineItem: { custom_fields: { alteration_notes: notes, status } } },
      { headers: { Authorization: `Bearer ${req.session?.lsAccessToken}` } }
    );
  } catch (err) {
    await logChange({ user: req.user, action: 'sync-fail', entity: 'AlterationJob', entityId: job.id, details: { error: err.message } });
  }
  res.json(job);
});

// DELETE /api/alterations/:id
router.delete('/:id', async (req, res) => {
  const alteration = await prisma.alteration.delete({ where: { id: Number(req.params.id) } });
  await logChange({
    user: req.user,
    action: 'delete',
    entity: 'Alteration',
    entityId: alteration.id,
    details: alteration,
  });
  // Simulate Lightspeed sync
  await logChange({
    user: req.user,
    action: 'sync',
    entity: 'Alteration',
    entityId: alteration.id,
    details: { message: 'Deleted from Lightspeed' },
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