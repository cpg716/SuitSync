import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import { setCustomFieldValue } from '../lightspeedClient'; // TODO: migrate this as well
import { getOrCreateSuitSyncAppointmentsField, verifyAndGetCustomField, createOrUpdateCustomField, initialize as initializeWorkflow } from '../services/workflowService';
import logger from '../utils/logger'; // TODO: migrate this as well
import { processWebhook } from '../services/webhookService';
import { executeWorkflowTriggers } from '../services/appointmentWorkflowService';
import { scheduleAppointmentReminders } from '../services/notificationSchedulingService';
import { lightspeedCustomFieldsService } from '../services/lightspeedCustomFieldsService';

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
  }) as (import('@prisma/client').Party & {
    members: import('@prisma/client').PartyMember[];
    appointments: import('@prisma/client').Appointment[];
  }) | null;
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
    const {
      partyId,
      dateTime,
      durationMinutes,
      tailorId,
      memberId,
      type,
      notes,
      status,
      individualCustomerId,
      assignedStaffId,
      workflowStage,
      autoScheduleNext
    } = req.body;

    const appointmentData: any = {
      dateTime: new Date(dateTime),
      durationMinutes,
      type,
      notes,
      status: status || 'scheduled'
    };

    // Handle party vs individual customer
    if (partyId) {
      appointmentData.partyId = partyId;
      if (memberId) {
        appointmentData.memberId = memberId;
      }
    } else if (individualCustomerId) {
      appointmentData.individualCustomerId = individualCustomerId;
    } else {
      res.status(400).json({ error: 'Either partyId or individualCustomerId is required' });
      return;
    }

    // Handle staff assignment (support both tailorId and assignedStaffId for compatibility)
    if (assignedStaffId || tailorId) {
      appointmentData.tailorId = assignedStaffId || tailorId;
    }

    // Workflow fields
    if (workflowStage) {
      appointmentData.workflowStage = workflowStage;
    }
    if (autoScheduleNext !== undefined) {
      appointmentData.autoScheduleNext = autoScheduleNext;
    }

    const appointment = await prisma.appointment.create({
      data: appointmentData,
      include: {
        party: true,
        member: true,
        individualCustomer: true,
        tailor: true
      }
    });

    // Sync to Lightspeed custom fields
    try {
      await lightspeedCustomFieldsService.syncAppointmentToLightspeed(req, appointment.id);
      logger.info(`Synced appointment ${appointment.id} to Lightspeed custom fields`);
    } catch (syncError: any) {
      logger.error('Error syncing to Lightspeed custom fields:', syncError);
      // Don't fail appointment creation if sync fails
    }

    // Legacy sync to Lightspeed if it's a party appointment
    if (partyId) {
      await syncAppointmentsToLightspeed(req, partyId);
    }

    // Schedule reminder notifications
    try {
      await scheduleAppointmentReminders(appointment.id);
      logger.info(`Scheduled reminders for appointment ${appointment.id}`);
    } catch (notificationError: any) {
      logger.error('Error scheduling appointment reminders:', notificationError);
      // Don't fail the appointment creation if notification scheduling fails
    }

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

    // Get the current appointment to check for status changes
    const currentAppointment = await prisma.appointment.findUnique({
      where: { id: appointmentId }
    });

    if (!currentAppointment) {
      res.status(404).json({ error: 'Appointment not found' });
      return;
    }

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

    // Trigger workflow automation if appointment was just completed
    if (status === 'completed' && currentAppointment.status !== 'completed') {
      try {
        const workflowResult = await executeWorkflowTriggers(appointmentId);
        logger.info(`Workflow triggers executed for appointment ${appointmentId}`, {
          actions: workflowResult.actions,
          errors: workflowResult.errors
        });

        // Include workflow results in response
        res.json({
          ...updatedAppointment,
          workflowResult
        });
      } catch (workflowError: any) {
        logger.error('Error executing workflow triggers:', workflowError);
        // Still return the updated appointment even if workflow fails
        res.json({
          ...updatedAppointment,
          workflowResult: {
            success: false,
            actions: [],
            errors: [workflowError.message || 'Workflow execution failed']
          }
        });
      }
    } else {
      if (updatedAppointment.partyId) {
      await syncAppointmentsToLightspeed(req, updatedAppointment.partyId);
    }
      res.json(updatedAppointment);
    }

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
    if (appointment.partyId) {
      await syncAppointmentsToLightspeed(req, appointment.partyId);
    }
    res.status(204).send();
    return;
  } catch (err: any) {
    logger.error(`Error deleting appointment ${req.params.id}:`, err);
    res.status(500).json({ error: 'Internal server error' });
    return;
  }
}; 