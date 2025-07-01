import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import { sendEmail, sendSMS } from './notificationService';

const prisma = new PrismaClient();

export interface NotificationSettings {
  reminderIntervals: string; // e.g., "24,3" for 24h and 3h before
  earlyMorningCutoff: string; // e.g., "09:30"
  emailSubject: string;
  emailBody: string;
  smsBody: string;
  pickupReadySubject: string;
  pickupReadyEmail: string;
  pickupReadySms: string;
}

/**
 * Schedule appointment reminder notifications
 */
export async function scheduleAppointmentReminders(appointmentId: number): Promise<void> {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        party: true,
        member: true,
        individualCustomer: true,
        tailor: true
      }
    });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    // Get notification settings
    const settings = await getNotificationSettings();
    
    // Parse reminder intervals
    const intervals = settings.reminderIntervals.split(',').map(i => parseInt(i.trim()));
    
    // Get customer contact info
    const contactInfo = getCustomerContactInfo(appointment);
    if (!contactInfo.email && !contactInfo.phone) {
      logger.warn(`No contact info available for appointment ${appointmentId}`);
      return;
    }

    // Clear existing reminders for this appointment
    await prisma.notificationSchedule.deleteMany({
      where: {
        appointmentId,
        type: {
          in: ['appointment_reminder_24h', 'appointment_reminder_3h', 'appointment_reminder_1h']
        }
      }
    });

    // Schedule new reminders
    for (const hoursBeforeInt of intervals) {
      const hoursBeforeFloat = parseFloat(hoursBeforeInt.toString());
      let reminderType: string;
      
      if (hoursBeforeFloat >= 24) {
        reminderType = 'appointment_reminder_24h';
      } else if (hoursBeforeFloat >= 3) {
        reminderType = 'appointment_reminder_3h';
      } else {
        reminderType = 'appointment_reminder_1h';
      }

      // Calculate reminder time
      const reminderTime = new Date(appointment.dateTime);
      reminderTime.setHours(reminderTime.getHours() - hoursBeforeFloat);

      // Special handling for early morning appointments
      if (isEarlyMorningAppointment(appointment.dateTime, settings.earlyMorningCutoff)) {
        // For 9:30am appointments, send 1h reminder instead of 3h
        if (hoursBeforeFloat === 3) {
          reminderTime.setHours(appointment.dateTime.getHours() - 1);
          reminderType = 'appointment_reminder_1h';
        }
      }

      // Don't schedule reminders in the past
      if (reminderTime <= new Date()) {
        continue;
      }

      // Create notification schedules
      if (contactInfo.email) {
        await createNotificationSchedule(
          appointmentId,
          reminderType as any,
          reminderTime,
          'email',
          contactInfo.email,
          settings.emailSubject,
          formatEmailBody(settings.emailBody, appointment, contactInfo)
        );
      }

      if (contactInfo.phone) {
        await createNotificationSchedule(
          appointmentId,
          reminderType as any,
          reminderTime,
          'sms',
          contactInfo.phone,
          null,
          formatSmsBody(settings.smsBody, appointment, contactInfo)
        );
      }
    }

    // Mark reminders as scheduled
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { remindersScheduled: true }
    });

    logger.info(`Scheduled reminders for appointment ${appointmentId}`);

  } catch (error: any) {
    logger.error('Error scheduling appointment reminders:', error);
    throw error;
  }
}

/**
 * Schedule pickup ready notification
 */
export async function schedulePickupReadyNotification(
  appointmentId: number,
  scheduleFor: Date = new Date()
): Promise<void> {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        party: true,
        member: true,
        individualCustomer: true
      }
    });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    const settings = await getNotificationSettings();
    const contactInfo = getCustomerContactInfo(appointment);

    if (!contactInfo.email && !contactInfo.phone) {
      logger.warn(`No contact info available for pickup notification ${appointmentId}`);
      return;
    }

    // Create pickup ready notifications
    if (contactInfo.email) {
      await createNotificationSchedule(
        appointmentId,
        'pickup_ready',
        scheduleFor,
        'email',
        contactInfo.email,
        settings.pickupReadySubject,
        formatEmailBody(settings.pickupReadyEmail, appointment, contactInfo)
      );
    }

    if (contactInfo.phone) {
      await createNotificationSchedule(
        appointmentId,
        'pickup_ready',
        scheduleFor,
        'sms',
        contactInfo.phone,
        null,
        formatSmsBody(settings.pickupReadySms, appointment, contactInfo)
      );
    }

    logger.info(`Scheduled pickup ready notification for appointment ${appointmentId}`);

  } catch (error: any) {
    logger.error('Error scheduling pickup ready notification:', error);
    throw error;
  }
}

/**
 * Process pending notifications
 */
export async function processPendingNotifications(): Promise<void> {
  try {
    const now = new Date();
    
    const pendingNotifications = await prisma.notificationSchedule.findMany({
      where: {
        sent: false,
        scheduledFor: {
          lte: now
        }
      },
      include: {
        appointment: {
          include: {
            party: true,
            member: true,
            individualCustomer: true,
            tailor: true
          }
        }
      },
      orderBy: {
        scheduledFor: 'asc'
      },
      take: 50 // Process in batches
    });

    for (const notification of pendingNotifications) {
      try {
        await sendNotification(notification);
        
        // Mark as sent
        await prisma.notificationSchedule.update({
          where: { id: notification.id },
          data: {
            sent: true,
            sentAt: new Date()
          }
        });

        logger.info(`Sent ${notification.type} notification for appointment ${notification.appointmentId}`);

      } catch (error: any) {
        logger.error(`Failed to send notification ${notification.id}:`, error);
        // Don't mark as sent if it failed
      }
    }

    if (pendingNotifications.length > 0) {
      logger.info(`Processed ${pendingNotifications.length} pending notifications`);
    }

  } catch (error: any) {
    logger.error('Error processing pending notifications:', error);
  }
}

/**
 * Send a notification
 */
async function sendNotification(notification: any): Promise<void> {
  if (notification.method === 'email' || notification.method === 'both') {
    await sendEmail({
      to: notification.recipient,
      subject: notification.subject || 'Appointment Reminder',
      html: notification.message
    });
  }

  if (notification.method === 'sms' || notification.method === 'both') {
    await sendSMS({
      to: notification.recipient,
      body: notification.message
    });
  }
}

/**
 * Create a notification schedule entry
 */
async function createNotificationSchedule(
  appointmentId: number,
  type: 'appointment_reminder_24h' | 'appointment_reminder_3h' | 'appointment_reminder_1h' | 'pickup_ready',
  scheduledFor: Date,
  method: 'email' | 'sms' | 'both',
  recipient: string,
  subject: string | null,
  message: string
): Promise<void> {
  await prisma.notificationSchedule.create({
    data: {
      appointmentId,
      type,
      scheduledFor,
      method,
      recipient,
      subject,
      message
    }
  });
}

/**
 * Get customer contact information
 */
function getCustomerContactInfo(appointment: any): { name: string; email?: string; phone?: string } {
  if (appointment.individualCustomer) {
    return {
      name: appointment.individualCustomer.name,
      email: appointment.individualCustomer.email,
      phone: appointment.individualCustomer.phone
    };
  } else if (appointment.party) {
    // For party appointments, use the party's primary customer contact
    return {
      name: appointment.member ? `${appointment.party.name} - ${appointment.member.role}` : appointment.party.name,
      email: appointment.party.customer?.email,
      phone: appointment.party.customer?.phone
    };
  }
  
  return { name: 'Customer' };
}

/**
 * Check if appointment is early morning
 */
function isEarlyMorningAppointment(appointmentTime: Date, cutoffTime: string): boolean {
  const [hours, minutes] = cutoffTime.split(':').map(Number);
  const cutoff = new Date(appointmentTime);
  cutoff.setHours(hours, minutes, 0, 0);
  
  return appointmentTime <= cutoff;
}

/**
 * Format email body with placeholders
 */
function formatEmailBody(template: string, appointment: any, contactInfo: any): string {
  return template
    .replace(/{customerName}/g, contactInfo.name)
    .replace(/{partyName}/g, appointment.party?.name || 'your appointment')
    .replace(/{dateTime}/g, appointment.dateTime.toLocaleString())
    .replace(/{shopName}/g, 'SuitSync')
    .replace(/{appointmentType}/g, appointment.type?.replace('_', ' ') || 'appointment');
}

/**
 * Format SMS body with placeholders
 */
function formatSmsBody(template: string, appointment: any, contactInfo: any): string {
  return template
    .replace(/{customerName}/g, contactInfo.name)
    .replace(/{partyName}/g, appointment.party?.name || 'your appointment')
    .replace(/{dateTime}/g, appointment.dateTime.toLocaleString())
    .replace(/{shopName}/g, 'SuitSync')
    .replace(/{appointmentType}/g, appointment.type?.replace('_', ' ') || 'appointment');
}

/**
 * Get notification settings
 */
async function getNotificationSettings(): Promise<NotificationSettings> {
  const settings = await prisma.settings.findFirst();
  
  return {
    reminderIntervals: settings?.reminderIntervals || '24,3',
    earlyMorningCutoff: settings?.earlyMorningCutoff || '09:30',
    emailSubject: settings?.emailSubject || 'Reminder: Your appointment at {shopName}',
    emailBody: settings?.emailBody || 'Hi {customerName},\nThis is a reminder for your appointment with {partyName} on {dateTime}.',
    smsBody: settings?.smsBody || 'Reminder: {partyName} appointment on {dateTime} at {shopName}.',
    pickupReadySubject: settings?.pickupReadySubject || 'Your garment is ready for pickup!',
    pickupReadyEmail: settings?.pickupReadyEmail || 'Hi {customerName},\nYour garment for {partyName} is ready for pickup!',
    pickupReadySms: settings?.pickupReadySms || 'Your garment for {partyName} is ready for pickup at {shopName}!'
  };
}
