import express from 'express';
import * as partiesController from '../controllers/partiesController';
import { authMiddleware, requirePermission } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import { logChange } from '../services/AuditLogService'; // TODO: migrate this as well
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();
const prisma = new PrismaClient().$extends(withAccelerate());

router.use(authMiddleware);

// Parties are for Sales, Sales Management, and Sales Support (assign)
router.get('/', requirePermission('parties', 'read'), asyncHandler(partiesController.listParties));
router.get('/:id', requirePermission('parties', 'read'), asyncHandler(partiesController.getPartyDetail));
router.post('/', requirePermission('parties', 'write'), asyncHandler(partiesController.createParty));

// GET /api/parties/:id/members
router.get('/:id/members', asyncHandler(async (req: express.Request, res: express.Response) => {
  const members = await prisma.partyMember.findMany({
    where: { partyId: Number(req.params.id) },
    orderBy: { id: 'asc' }
  });
  res.json(members);
}));

// GET /api/parties/:partyId/members/:memberId/measurements
router.get('/:partyId/members/:memberId/measurements', asyncHandler(async (req: express.Request, res: express.Response) => {
  const memberId = Number(req.params.memberId);
  if (!memberId) return res.status(400).json({ error: 'Invalid member id' });
  const member = await prisma.partyMember.findUnique({ where: { id: memberId } });
  if (!member) return res.status(404).json({ error: 'Not found' });
  res.json({ measurements: member.measurements || {} });
}));

// POST /api/parties/:id/members
router.post('/:id/members', asyncHandler(async (req: express.Request, res: express.Response) => {
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
    user: (req as any).user,
    action: 'create',
    entity: 'PartyMember',
    entityId: member.id,
    details: req.body,
  });
  res.status(201).json(member);
}));

// PUT /api/parties/:id
router.put('/:id', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { name, eventDate, customerId, externalId } = req.body;
  const party = await prisma.party.update({
    where: { id: Number(req.params.id) },
    data: { name, eventDate: new Date(eventDate), customerId, externalId },
  });
  await logChange({
    user: (req as any).user,
    action: 'update',
    entity: 'Party',
    entityId: party.id,
    details: req.body,
  });
  // Simulate Lightspeed sync
  await logChange({
    user: (req as any).user,
    action: 'sync',
    entity: 'Party',
    entityId: party.id,
    details: { message: 'Synced to Lightspeed' },
  });
  res.json(party);
}));

// PUT /api/parties/:id/members/:memberId
router.put('/:id/members/:memberId', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { lsCustomerId, role, measurements, notes, status } = req.body;
  const member = await prisma.partyMember.update({
    where: { id: Number(req.params.memberId) },
    data: { lsCustomerId, role, measurements, notes, status },
  });
  await logChange({
    user: (req as any).user,
    action: 'update',
    entity: 'PartyMember',
    entityId: member.id,
    details: req.body,
  });
  res.json(member);
}));

// PUT /api/parties/:partyId/members/:memberId/measurements
router.put('/:partyId/members/:memberId/measurements', asyncHandler(async (req: express.Request, res: express.Response) => {
  const memberId = Number(req.params.memberId);
  if (!memberId) return res.status(400).json({ error: 'Invalid member id' });
  const { measurements, copyFromCustomer } = req.body;
  let newMeasurements = measurements;
  if (copyFromCustomer) {
    const member = await prisma.partyMember.findUnique({ where: { id: memberId } });
    if (!member || !member.lsCustomerId) return res.status(400).json({ error: 'No linked customer' });
    const customer = await prisma.customer.findUnique({ where: { id: Number(member.lsCustomerId) }, select: { measurements: true } });
    if (!customer || typeof customer.measurements === 'undefined') return res.status(400).json({ error: 'No measurements on customer' });
    newMeasurements = customer.measurements;
  }
  if (!newMeasurements || typeof newMeasurements !== 'object') return res.status(400).json({ error: 'Invalid measurements' });
  const updated = await prisma.partyMember.update({
    where: { id: memberId },
    data: { measurements: newMeasurements },
  });
  res.json({ measurements: updated.measurements });
}));

// DELETE /api/parties/:id
router.delete('/:id', asyncHandler(async (req: express.Request, res: express.Response) => {
  const party = await prisma.party.delete({ where: { id: Number(req.params.id) } });
  await logChange({
    user: (req as any).user,
    action: 'delete',
    entity: 'Party',
    entityId: party.id,
    details: party,
  });
  // Simulate Lightspeed sync
  await logChange({
    user: (req as any).user,
    action: 'sync',
    entity: 'Party',
    entityId: party.id,
    details: { message: 'Deleted from Lightspeed' },
  });
  res.json({ success: true });
}));

// DELETE /api/parties/:id/members/:memberId
router.delete('/:id/members/:memberId', asyncHandler(async (req: express.Request, res: express.Response) => {
  await prisma.partyMember.delete({ where: { id: Number(req.params.memberId) } });
  await logChange({
    user: (req as any).user,
    action: 'delete',
    entity: 'PartyMember',
    entityId: Number(req.params.memberId),
    details: { memberId: req.params.memberId },
  });
  res.json({ success: true });
}));

export default router; 