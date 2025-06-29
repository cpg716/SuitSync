import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import { setCustomFieldValue } from '../lightspeedClient'; // TODO: migrate this as well
import { getOrCreateSuitSyncAppointmentsField, verifyAndGetCustomField, createOrUpdateCustomField, initialize as initializeWorkflow } from '../services/workflowService';
import logger from '../utils/logger'; // TODO: migrate this as well
import { processWebhook } from '../services/webhookService';

const prisma = new PrismaClient().$extends(withAccelerate());

const getAppointmentsAndLsCustomerId = async (partyId: number) => {
  const party = await prisma.party.findUnique({
    where: { id: partyId },
    include: {
      members: {
        take: 1,
      },
      appointments: {
        orderBy: { dateTime: 'asc' },
        include: { tailor: true, member: true },
      },
    },
  });
  if (!party) {
    throw new Error('Party not found');
  }
  const anchorMember = party.members[0];
  if (!anchorMember || !anchorMember.lsCustomerId) {
    throw new Error('No members found for this party to use as Lightspeed anchor.');
  }
  return {
    lightspeedCustomerId: anchorMember.lsCustomerId,
    appointments: party.appointments,
  };
};

const syncAppointmentsToLightspeed = async (req: any, partyId: number) => {
  try {
    const { lightspeedCustomerId, appointments } = await getAppointmentsAndLsCustomerId(partyId);
    const appointmentsField = await getOrCreateSuitSyncAppointmentsField();
    const payload = appointments.map((appt: any) => ({
      id: appt.id,
      dateTime: appt.dateTime,
      type: appt.type,
      tailor: appt.tailor?.name,
      member: appt.member?.notes,
      notes: appt.notes,
    }));
    await setCustomFieldValue(req.session, {
      customFieldId: appointmentsField.id,
      resourceId: lightspeedCustomerId,
      value: JSON.stringify(payload),
    });
    logger.info(`Successfully synced ${payload.length} appointments to LS Customer ${lightspeedCustomerId}.`);
  } catch (error: any) {
    logger.warn(`Could not sync appointments to Lightspeed for party ${partyId}:`, error.message);
  }
};

export const listAppointments = async (req: Request, res: Response): Promise<void> => {
  try {
    const appointments = await prisma.appointment.findMany({
      include: { party: true, tailor: true, member: true },
      orderBy: { dateTime: 'desc' },
    });
    res.json(appointments);
    return;
  } catch (err: any) {
    logger.error('Error listing appointments:', err);
    res.status(500).json({ error: 'Internal server error' });
    return;
  }
};

export const createAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { partyId, dateTime, durationMinutes, tailorId, memberId, type, notes } = req.body;
    const appointment = await prisma.appointment.create({
      data: { 
        partyId, 
        dateTime: new Date(dateTime), 
        durationMinutes, 
        tailorId, 
        memberId,
        type, 
        notes 
      },
    });
    await syncAppointmentsToLightspeed(req, partyId);
    res.status(201).json(appointment);
    return;
  } catch (err: any) {
    logger.error('Error creating appointment:', err);
    res.status(500).json({ error: 'Internal server error' });
    return;
  }
};

export const updateAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    const appointmentId = Number(req.params.id);
    const { dateTime, durationMinutes, tailorId, memberId, type, notes, status } = req.body;
    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        dateTime: dateTime ? new Date(dateTime) : undefined,
        durationMinutes,
        tailorId,
        memberId,
        type,
        notes,
        status,
      },
    });
    await syncAppointmentsToLightspeed(req, updatedAppointment.partyId);
    res.json(updatedAppointment);
    return;
  } catch (err: any) {
    logger.error(`Error updating appointment ${req.params.id}:`, err);
    res.status(500).json({ error: 'Internal server error' });
    return;
  }
};

export const deleteAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    const appointmentId = Number(req.params.id);
    const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId }});
    if (!appointment) {
      res.status(404).json({ error: 'Appointment not found' });
      return;
    }
    await prisma.appointment.delete({ where: { id: appointmentId } });
    await syncAppointmentsToLightspeed(req, appointment.partyId);
    res.status(204).send();
    return;
  } catch (err: any) {
    logger.error(`Error deleting appointment ${req.params.id}:`, err);
    res.status(500).json({ error: 'Internal server error' });
    return;
  }
}; 