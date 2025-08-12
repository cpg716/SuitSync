import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import { setCustomFieldValue } from '../lightspeedClient'; // TODO: migrate this as well
import { getOrCreateSuitSyncAppointmentsField, verifyAndGetCustomField, createOrUpdateCustomField, initialize as initializeWorkflow } from '../services/workflowService';
import logger from '../utils/logger'; // TODO: migrate this as well
import { processWebhook } from '../services/webhookService';
import { executeWorkflowTriggers, scheduleNextAppointment } from '../services/appointmentWorkflowService';
import { scheduleAppointmentReminders } from '../services/notificationSchedulingService';
import { lightspeedCustomFieldsService } from '../services/lightspeedCustomFieldsService';
import { Route, Get, Post, Body, Path, SuccessResponse, Tags, Controller } from 'tsoa';
import { sendAppointmentConfirmationNotification } from '../services/staffNotificationService';
import { sendCancellationNotificationToStaff } from '../services/staffNotificationService';
import AuditLogService, { logChange } from '../services/AuditLogService';

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
      customFieldId: String(appointmentsField.id),
      resourceId: lightspeedCustomerId,
      value: JSON.stringify(payload),
    });
    logger.info(`Successfully synced ${payload.length} appointments to LS Customer ${lightspeedCustomerId}.`);
  } catch (error: any) {
    logger.warn(`Could not sync appointments to Lightspeed for party ${partyId}:`, error.message);
  }
};

// TSOA-compliant controller for OpenAPI
@Route('appointments')
@Tags('Appointments')
export class AppointmentController extends Controller {
  /** List all appointments */
  @Get('/')
  public async list(): Promise<any[]> {
    return prisma.appointment.findMany();
  }

  /** Get appointment by ID */
  @Get('{id}')
  public async getById(@Path() id: number): Promise<any | null> {
    return prisma.appointment.findUnique({ where: { id } });
  }

  /** Create a new appointment */
  @SuccessResponse('201', 'Created')
  @Post('/')
  public async create(@Body() dto: any): Promise<any> {
    this.setStatus(201);
    return prisma.appointment.create({ data: dto });
  }
}

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

    // Basic conflict checks: customer/member and tailor overlapping
    const conflictChecks: Promise<any>[] = [];
    if (tailorId) {
      conflictChecks.push(prisma.appointment.findFirst({
        where: {
          tailorId,
          dateTime: {
            gte: new Date(new Date(dateTime).getTime() - (durationMinutes || 60) * 60000),
            lte: new Date(new Date(dateTime).getTime() + (durationMinutes || 60) * 60000),
          },
          status: { in: ['scheduled', 'confirmed', 'in_progress'] as any },
        },
      }));
    }
    if (memberId) {
      conflictChecks.push(prisma.appointment.findFirst({
        where: {
          memberId,
          dateTime: {
            gte: new Date(new Date(dateTime).getTime() - (durationMinutes || 60) * 60000),
            lte: new Date(new Date(dateTime).getTime() + (durationMinutes || 60) * 60000),
          },
          status: { in: ['scheduled', 'confirmed', 'in_progress'] as any },
        },
      }));
    }
    const conflicts = await Promise.all(conflictChecks);
    if (conflicts.some(Boolean)) {
      res.status(409).json({ error: 'Scheduling conflict detected' });
      return;
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

    // Log appointment creation for audit
    await logChange(
      (req as any).user?.id,
      'create',
      'Appointment',
      appointment.id,
      {
        appointmentData,
        partyId: appointment.partyId,
        partyName: appointment.party?.name,
        customerName: appointment.individualCustomer 
          ? `${appointment.individualCustomer.first_name || ''} ${appointment.individualCustomer.last_name || ''}`.trim()
          : appointment.member?.notes || 'Party Member'
      },
      req
    );

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

    // Send confirmation notification to customer
    try {
      await sendAppointmentConfirmationNotification(appointment.id);
      logger.info(`Sent confirmation notification for appointment ${appointment.id}`);
    } catch (confirmationError: any) {
      logger.error('Error sending appointment confirmation:', confirmationError);
      // Don't fail the appointment creation if confirmation fails
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
      where: { id: appointmentId },
      include: {
        party: true,
        member: true,
        tailor: true,
        individualCustomer: true
      }
    });

    if (!currentAppointment) {
      res.status(404).json({ error: 'Appointment not found' });
      return;
    }

    // Conflict check for updated time/tailor/member
    if (dateTime || tailorId || memberId) {
      const newStart = dateTime ? new Date(dateTime) : currentAppointment.dateTime;
      const duration = (typeof durationMinutes === 'number' ? durationMinutes : currentAppointment.durationMinutes) || 60;
      const checks: Promise<any>[] = [];
      const newTailorId = typeof tailorId === 'number' ? tailorId : currentAppointment.tailorId;
      const newMemberId = typeof memberId === 'number' ? memberId : currentAppointment.memberId;
      if (newTailorId) {
        checks.push(prisma.appointment.findFirst({
          where: {
            id: { not: appointmentId },
            tailorId: newTailorId,
            dateTime: {
              gte: new Date(newStart.getTime() - duration * 60000),
              lte: new Date(newStart.getTime() + duration * 60000),
            },
            status: { in: ['scheduled', 'confirmed', 'in_progress'] as any },
          },
        }));
      }
      if (newMemberId) {
        checks.push(prisma.appointment.findFirst({
          where: {
            id: { not: appointmentId },
            memberId: newMemberId,
            dateTime: {
              gte: new Date(newStart.getTime() - duration * 60000),
              lte: new Date(newStart.getTime() + duration * 60000),
            },
            status: { in: ['scheduled', 'confirmed', 'in_progress'] as any },
          },
        }));
      }
      const found = await Promise.all(checks);
      if (found.some(Boolean)) {
        res.status(409).json({ error: 'Scheduling conflict detected' });
        return;
      }
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
      include: {
        party: true,
        member: true,
        tailor: true,
        individualCustomer: true
      }
    });

    // Log appointment changes for audit
    const changes: Record<string, any> = {};
    if (dateTime && currentAppointment.dateTime.getTime() !== new Date(dateTime).getTime()) {
      changes.dateTime = { from: currentAppointment.dateTime, to: new Date(dateTime) };
    }
    if (durationMinutes !== undefined && currentAppointment.durationMinutes !== durationMinutes) {
      changes.durationMinutes = { from: currentAppointment.durationMinutes, to: durationMinutes };
    }
    if (tailorId !== undefined && currentAppointment.tailorId !== tailorId) {
      changes.tailorId = { from: currentAppointment.tailorId, to: tailorId };
    }
    if (memberId !== undefined && currentAppointment.memberId !== memberId) {
      changes.memberId = { from: currentAppointment.memberId, to: memberId };
    }
    if (type !== undefined && currentAppointment.type !== type) {
      changes.type = { from: currentAppointment.type, to: type };
    }
    if (notes !== undefined && currentAppointment.notes !== notes) {
      changes.notes = { from: currentAppointment.notes, to: notes };
    }
    if (status !== undefined && currentAppointment.status !== status) {
      changes.status = { from: currentAppointment.status, to: status };
    }

    if (Object.keys(changes).length > 0) {
      await logChange(
        (req as any).user?.id,
        'update',
        'Appointment',
        appointmentId,
        changes,
        req
      );
    }

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
    const appointment = await prisma.appointment.findUnique({ 
      where: { id: appointmentId },
      include: {
        party: true,
        member: true,
        individualCustomer: true
      }
    });
    if (!appointment) {
      res.status(404).json({ error: 'Appointment not found' });
      return;
    }

    // Log appointment deletion for audit
    await logChange(
      (req as any).user?.id,
      'delete',
      'Appointment',
      appointmentId,
      { appointmentType: appointment.type, scheduledAt: appointment.dateTime },
      req
    );

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

/**
 * Get a single appointment by ID
 */
export const getAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({ error: 'Appointment ID is required' });
      return;
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: parseInt(id) },
      include: {
        party: true,
        individualCustomer: true,
        tailor: true,
        member: true
      }
    });

    if (!appointment) {
      res.status(404).json({ error: 'Appointment not found' });
      return;
    }

    res.json(appointment);
  } catch (error: any) {
    logger.error(`Error getting appointment ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Manually trigger workflow execution for an appointment
 */
export const triggerWorkflow = async (req: Request, res: Response): Promise<void> => {
  try {
    const { appointmentId } = req.params;
    
    if (!appointmentId) {
      res.status(400).json({ error: 'Appointment ID is required' });
      return;
    }

    const result = await executeWorkflowTriggers(parseInt(appointmentId));
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Workflow triggered successfully',
        actions: result.actions,
        requiresNextScheduling: result.requiresNextScheduling,
        suggestedNextAppointment: result.suggestedNextAppointment,
        nextAppointmentId: result.nextAppointmentId,
        alterationJobId: result.alterationJobId,
        orderStubId: result.orderStubId
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Workflow trigger failed',
        errors: result.errors
      });
    }
  } catch (error: any) {
    logger.error('Error triggering workflow:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Manually schedule the next appointment after workflow completion
 */
export const scheduleNextAppointmentController = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      partyId,
      memberId,
      appointmentType,
      dateTime,
      durationMinutes,
      tailorId,
      notes
    } = req.body;

    if (!partyId || !memberId || !appointmentType || !dateTime || !durationMinutes) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const result = await scheduleNextAppointment(
      parseInt(partyId),
      parseInt(memberId),
      appointmentType,
      new Date(dateTime),
      parseInt(durationMinutes),
      tailorId ? parseInt(tailorId) : undefined,
      notes
    );

    if (result.success) {
      res.json({
        success: true,
        message: 'Next appointment scheduled successfully',
        actions: result.actions,
        nextAppointmentId: result.nextAppointmentId
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to schedule next appointment',
        errors: result.errors
      });
    }
  } catch (error: any) {
    logger.error('Error scheduling next appointment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}; 

/**
 * Reschedule an appointment
 */
// Public endpoint: reschedule using signed JWT token
export const rescheduleAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { appointmentId, token, newDateTime, newDurationMinutes, notes } = req.body;

    if (!appointmentId || !token || !newDateTime) {
      res.status(400).json({ error: 'Appointment ID, token, and new date/time are required' });
      return;
    }

    // Verify token (JWT signed link)
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      res.status(500).json({ error: 'JWT secret not configured' });
      return;
    }
    try {
      const payload = jwt.verify(token, secret) as any;
      if (!payload || String(payload.appointmentId) !== String(appointmentId) || payload.action !== 'reschedule') {
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
      }
    } catch (e) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: parseInt(appointmentId) },
      include: {
        party: true,
        member: true,
        individualCustomer: true,
        tailor: true
      }
    });

    if (!appointment) {
      res.status(404).json({ error: 'Appointment not found' });
      return;
    }

    // Check if appointment is in the future and can be rescheduled
    if (appointment.dateTime <= new Date()) {
      res.status(400).json({ error: 'Cannot reschedule past appointments' });
      return;
    }

    // Update the appointment
    const updatedAppointment = await prisma.appointment.update({
      where: { id: parseInt(appointmentId) },
      data: {
        dateTime: new Date(newDateTime),
        durationMinutes: newDurationMinutes || appointment.durationMinutes,
        notes: notes || appointment.notes,
        status: 'rescheduled'
      },
      include: {
        party: true,
        member: true,
        individualCustomer: true,
        tailor: true
      }
    });

    // Send confirmation notification
    try {
      await sendAppointmentConfirmationNotification(updatedAppointment.id);
      logger.info(`Sent reschedule confirmation for appointment ${appointmentId}`);
    } catch (notificationError: any) {
      logger.error('Error sending reschedule confirmation:', notificationError);
    }

    res.json({
      success: true,
      message: 'Appointment rescheduled successfully',
      appointment: updatedAppointment
    });
  } catch (err: any) {
    logger.error('Error rescheduling appointment:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Cancel an appointment
 */
// Public endpoint: cancel using signed JWT token
export const cancelAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { appointmentId, token, reason } = req.body;

    if (!appointmentId || !token) {
      res.status(400).json({ error: 'Appointment ID and token are required' });
      return;
    }

    // Verify JWT token
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      res.status(500).json({ error: 'JWT secret not configured' });
      return;
    }
    try {
      const payload = jwt.verify(token, secret) as any;
      if (!payload || String(payload.appointmentId) !== String(appointmentId) || payload.action !== 'cancel') {
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
      }
    } catch (e) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: parseInt(appointmentId) },
      include: {
        party: true,
        member: true,
        individualCustomer: true,
        tailor: true
      }
    });

    if (!appointment) {
      res.status(404).json({ error: 'Appointment not found' });
      return;
    }

    // Check if appointment is in the future and can be canceled
    if (appointment.dateTime <= new Date()) {
      res.status(400).json({ error: 'Cannot cancel past appointments' });
      return;
    }

    // Update the appointment
    const updatedAppointment = await prisma.appointment.update({
      where: { id: parseInt(appointmentId) },
      data: {
        status: 'canceled',
        notes: reason ? `${appointment.notes || ''}\n\nCancellation reason: ${reason}` : appointment.notes
      },
      include: {
        party: true,
        member: true,
        individualCustomer: true,
        tailor: true
      }
    });

    // Send cancellation notification to staff
    try {
      await sendCancellationNotificationToStaff(updatedAppointment);
      logger.info(`Sent cancellation notification to staff for appointment ${appointmentId}`);
    } catch (notificationError: any) {
      logger.error('Error sending cancellation notification to staff:', notificationError);
    }

    res.json({
      success: true,
      message: 'Appointment canceled successfully',
      appointment: updatedAppointment
    });
  } catch (err: any) {
    logger.error('Error canceling appointment:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}; 