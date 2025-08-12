import express from 'express';
import * as partiesController from '../controllers/partiesController';
import { authMiddleware, requirePermission } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import AuditLogService, { logChange } from '../services/AuditLogService';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();
const prisma = new PrismaClient().$extends(withAccelerate());

router.use(authMiddleware);

// Parties are for Sales, Sales Management, and Sales Support (assign)
router.get('/', requirePermission('parties', 'read'), asyncHandler(partiesController.listParties));
router.get('/with-status', requirePermission('parties', 'read'), asyncHandler(partiesController.getPartiesWithStatus));
router.get('/:id', requirePermission('parties', 'read'), asyncHandler(partiesController.getPartyDetail));
router.get('/:id/status-summary', requirePermission('parties', 'read'), asyncHandler(partiesController.getPartyStatusSummary));
router.post('/', requirePermission('parties', 'write'), asyncHandler(partiesController.createParty));

// Updated routes using Lightspeed Customer Groups API 2.0+
router.put('/:id', requirePermission('parties', 'write'), asyncHandler(partiesController.updateParty));
router.delete('/:id', requirePermission('parties', 'write'), asyncHandler(partiesController.deleteParty));

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

// POST /api/parties/:id/members - Updated to use Lightspeed Customer Groups API
router.post('/:id/members', requirePermission('parties', 'write'), asyncHandler(partiesController.addMemberToParty));

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

// PUT /api/parties/members/:memberId/status
router.put('/members/:memberId/status', requirePermission('parties', 'write'), asyncHandler(partiesController.updatePartyMemberStatus));

// PUT /api/parties/:partyId/members/:memberId/measurements
router.put('/:partyId/members/:memberId/measurements', asyncHandler(async (req: express.Request, res: express.Response) => {
  const memberId = Number(req.params.memberId);
  if (!memberId) return res.status(400).json({ error: 'Invalid member id' });
  const { measurements, copyFromCustomer } = req.body;
  
  // Get current member to check status
  const currentMember = await prisma.partyMember.findUnique({
    where: { id: memberId }
  });

  if (!currentMember) {
    return res.status(404).json({ error: 'Member not found' });
  }

  let newMeasurements = measurements;
  if (copyFromCustomer) {
    if (!currentMember.lsCustomerId) return res.status(400).json({ error: 'No linked customer' });
    const customer = await prisma.customer.findUnique({ where: { id: Number(currentMember.lsCustomerId) }, select: { measurements: true } });
    if (!customer || typeof customer.measurements === 'undefined') return res.status(400).json({ error: 'No measurements on customer' });
    newMeasurements = customer.measurements;
  }
  
  if (!newMeasurements || typeof newMeasurements !== 'object') return res.status(400).json({ error: 'Invalid measurements' });
  
  // Prepare update data
  const updateData: any = { measurements: newMeasurements };
  
  // Auto-transition to "need_to_order" if measurements are being added and member is in "awaiting_measurements"
  if (newMeasurements && currentMember.status === 'awaiting_measurements') {
    updateData.status = 'need_to_order';
  }

  const updated = await prisma.partyMember.update({
    where: { id: memberId },
    data: updateData,
  });

  // Log the status transition if it occurred
  if (updateData.status) {
    await logChange({
      user: (req as any).user,
      action: 'update',
      entity: 'PartyMember',
      entityId: memberId,
      details: { 
        measurements: newMeasurements,
        statusTransition: { from: currentMember.status, to: updateData.status }
      },
    });
  }

  res.json({ 
    measurements: updated.measurements,
    status: updated.status,
    statusTransition: updateData.status ? { from: currentMember.status, to: updateData.status } : undefined
  });
}));

// DELETE /api/parties/:id/members/:memberId - Updated to use Lightspeed Customer Groups API
router.delete('/:id/members/:memberId', requirePermission('parties', 'write'), asyncHandler(partiesController.removeMemberFromParty));

export default router; 