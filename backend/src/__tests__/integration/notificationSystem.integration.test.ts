import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import {
  scheduleAppointmentReminders,
  schedulePickupReadyNotification,
  processPendingNotifications
} from '../../services/notificationSchedulingService';
import { scheduledJobService } from '../../services/scheduledJobService';
import {
  createTestUser,
  createTestCustomer,
  createTestParty,
  cleanupDatabase,
  prisma
} from '../utils/testHelpers';

// Mock notification services
jest.mock('../../services/notificationService', () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
  sendSMS: jest.fn().mockResolvedValue(true)
}));

import { sendEmail, sendSMS } from '../../services/notificationService';

describe('Notification System Integration Tests', () => {
  beforeEach(async () => {
    await cleanupDatabase();
    jest.clearAllMocks();

    // Create default settings
    await prisma.settings.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        reminderIntervals: '24,3',
        earlyMorningCutoff: '09:30',
        emailSubject: 'Reminder: Your appointment at {shopName}',
        emailBody: 'Hi {customerName},\n\nThis is a reminder for your appointment with {partyName} on {dateTime}.',
        smsBody: 'Reminder: {partyName} appointment on {dateTime} at {shopName}.',
        pickupReadySubject: 'Your garment is ready for pickup!',
        pickupReadyEmail: 'Hi {customerName},\n\nYour garment for {partyName} is ready for pickup!',
        pickupReadySms: 'Your garment for {partyName} is ready for pickup at {shopName}!'
      }
    });
  });

  afterAll(async () => {
    await cleanupDatabase();
    await prisma.$disconnect();
  });

  describe('Appointment Reminder Scheduling', () => {
    let customer: any;
    let party: any;
    let member: any;
    let appointment: any;

    beforeEach(async () => {
      customer = await createTestCustomer({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890'
      });
      party = await createTestParty(customer.id, {
        name: 'Doe Wedding',
        eventDate: new Date('2024-12-31T18:00:00Z')
      });
      member = await prisma.partyMember.create({
        data: {
          partyId: party.id,
          role: 'Groom',
          lsCustomerId: customer.lightspeedId
        }
      });

      // Create future appointment
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      futureDate.setHours(14, 0, 0, 0); // 2:00 PM

      appointment = await prisma.appointment.create({
        data: {
          partyId: party.id,
          memberId: member.id,
          dateTime: futureDate,
          type: 'first_fitting',
          status: 'scheduled',
          durationMinutes: 90
        }
      });
    });

    test('should schedule standard appointment reminders', async () => {
      await scheduleAppointmentReminders(appointment.id);

      const notifications = await prisma.notificationSchedule.findMany({
        where: { appointmentId: appointment.id },
        orderBy: { scheduledFor: 'asc' }
      });

      expect(notifications).toHaveLength(4); // 2 intervals × 2 methods (email + SMS)

      // Check 24-hour reminders
      const twentyFourHourReminders = notifications.filter(n => 
        n.type === 'appointment_reminder_24h'
      );
      expect(twentyFourHourReminders).toHaveLength(2); // email + SMS

      // Check 3-hour reminders
      const threeHourReminders = notifications.filter(n => 
        n.type === 'appointment_reminder_3h'
      );
      expect(threeHourReminders).toHaveLength(2); // email + SMS

      // Verify timing
      const expectedTwentyFourHour = new Date(appointment.dateTime);
      expectedTwentyFourHour.setHours(expectedTwentyFourHour.getHours() - 24);
      
      const actualTwentyFourHour = twentyFourHourReminders[0].scheduledFor;
      expect(Math.abs(actualTwentyFourHour.getTime() - expectedTwentyFourHour.getTime())).toBeLessThan(60000);
    });

    test('should handle early morning appointment reminders', async () => {
      // Update appointment to early morning
      const earlyMorningDate = new Date(appointment.dateTime);
      earlyMorningDate.setHours(9, 0, 0, 0); // 9:00 AM

      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { dateTime: earlyMorningDate }
      });

      await scheduleAppointmentReminders(appointment.id);

      const notifications = await prisma.notificationSchedule.findMany({
        where: { appointmentId: appointment.id }
      });

      // Should have 1-hour reminders instead of 3-hour for early morning
      const oneHourReminders = notifications.filter(n => 
        n.type === 'appointment_reminder_1h'
      );
      expect(oneHourReminders.length).toBeGreaterThan(0);

      const threeHourReminders = notifications.filter(n => 
        n.type === 'appointment_reminder_3h'
      );
      expect(threeHourReminders).toHaveLength(0);
    });

    test('should not schedule reminders for past appointments', async () => {
      // Create past appointment
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const pastAppointment = await prisma.appointment.create({
        data: {
          partyId: party.id,
          memberId: member.id,
          dateTime: pastDate,
          type: 'first_fitting',
          status: 'scheduled',
          durationMinutes: 90
        }
      });

      await scheduleAppointmentReminders(pastAppointment.id);

      const notifications = await prisma.notificationSchedule.findMany({
        where: { appointmentId: pastAppointment.id }
      });

      expect(notifications).toHaveLength(0);
    });

    test('should replace existing reminders when rescheduling', async () => {
      // Schedule initial reminders
      await scheduleAppointmentReminders(appointment.id);

      const initialCount = await prisma.notificationSchedule.count({
        where: { appointmentId: appointment.id }
      });

      // Reschedule appointment
      const newDate = new Date(appointment.dateTime);
      newDate.setDate(newDate.getDate() + 1);

      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { dateTime: newDate }
      });

      // Schedule new reminders
      await scheduleAppointmentReminders(appointment.id);

      const finalCount = await prisma.notificationSchedule.count({
        where: { appointmentId: appointment.id }
      });

      expect(finalCount).toBe(initialCount); // Should replace, not add
    });

    test('should format notification messages with placeholders', async () => {
      await scheduleAppointmentReminders(appointment.id);

      const emailNotification = await prisma.notificationSchedule.findFirst({
        where: { 
          appointmentId: appointment.id,
          method: 'email'
        }
      });

      expect(emailNotification!.subject).toContain('SuitSync');
      expect(emailNotification!.message).toContain('John Doe');
      expect(emailNotification!.message).toContain('Doe Wedding');
    });
  });

  describe('Pickup Ready Notifications', () => {
    let customer: any;
    let party: any;
    let member: any;
    let appointment: any;

    beforeEach(async () => {
      customer = await createTestCustomer({
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '+1987654321'
      });
      party = await createTestParty(customer.id, {
        name: 'Smith Wedding'
      });
      member = await prisma.partyMember.create({
        data: {
          partyId: party.id,
          role: 'Bride',
          lsCustomerId: customer.lightspeedId
        }
      });

      appointment = await prisma.appointment.create({
        data: {
          partyId: party.id,
          memberId: member.id,
          dateTime: new Date('2024-12-24T10:00:00Z'),
          type: 'pickup',
          status: 'scheduled',
          durationMinutes: 30
        }
      });
    });

    test('should schedule pickup ready notifications', async () => {
      const scheduleTime = new Date();
      await schedulePickupReadyNotification(appointment.id, scheduleTime);

      const notifications = await prisma.notificationSchedule.findMany({
        where: { 
          appointmentId: appointment.id,
          type: 'pickup_ready'
        }
      });

      expect(notifications).toHaveLength(2); // email + SMS

      const emailNotification = notifications.find(n => n.method === 'email');
      const smsNotification = notifications.find(n => n.method === 'sms');

      expect(emailNotification).toBeDefined();
      expect(smsNotification).toBeDefined();
      expect(emailNotification!.subject).toContain('ready for pickup');
      expect(smsNotification!.message).toContain('ready for pickup');
    });

    test('should handle individual customer pickup notifications', async () => {
      const individualAppointment = await prisma.appointment.create({
        data: {
          individualCustomerId: customer.id,
          dateTime: new Date('2024-12-24T10:00:00Z'),
          type: 'pickup',
          status: 'scheduled',
          durationMinutes: 30
        }
      });

      await schedulePickupReadyNotification(individualAppointment.id);

      const notifications = await prisma.notificationSchedule.findMany({
        where: { 
          appointmentId: individualAppointment.id,
          type: 'pickup_ready'
        }
      });

      expect(notifications.length).toBeGreaterThan(0);
    });
  });

  describe('Notification Processing', () => {
    let customer: any;
    let appointment: any;

    beforeEach(async () => {
      customer = await createTestCustomer({
        email: 'test@example.com',
        phone: '+1234567890'
      });

      appointment = await prisma.appointment.create({
        data: {
          individualCustomerId: customer.id,
          dateTime: new Date(),
          type: 'first_fitting',
          status: 'scheduled',
          durationMinutes: 90
        }
      });
    });

    test('should process pending notifications', async () => {
      // Create pending notifications
      const now = new Date();
      const pastTime = new Date(now.getTime() - 60000); // 1 minute ago

      await prisma.notificationSchedule.createMany({
        data: [
          {
            appointmentId: appointment.id,
            type: 'appointment_reminder_24h',
            scheduledFor: pastTime,
            method: 'email',
            recipient: 'test@example.com',
            subject: 'Test reminder',
            message: 'Test message',
            sent: false
          },
          {
            appointmentId: appointment.id,
            type: 'appointment_reminder_24h',
            scheduledFor: pastTime,
            method: 'sms',
            recipient: '+1234567890',
            message: 'Test SMS',
            sent: false
          }
        ]
      });

      await processPendingNotifications();

      // Check that notifications were marked as sent
      const sentNotifications = await prisma.notificationSchedule.findMany({
        where: { 
          appointmentId: appointment.id,
          sent: true
        }
      });

      expect(sentNotifications).toHaveLength(2);
      expect(sendEmail).toHaveBeenCalledTimes(1);
      expect(sendSMS).toHaveBeenCalledTimes(1);
    });

    test('should not process future notifications', async () => {
      const futureTime = new Date();
      futureTime.setHours(futureTime.getHours() + 1);

      await prisma.notificationSchedule.create({
        data: {
          appointmentId: appointment.id,
          type: 'appointment_reminder_24h',
          scheduledFor: futureTime,
          method: 'email',
          recipient: 'test@example.com',
          subject: 'Future reminder',
          message: 'Future message',
          sent: false
        }
      });

      await processPendingNotifications();

      const sentNotifications = await prisma.notificationSchedule.findMany({
        where: { 
          appointmentId: appointment.id,
          sent: true
        }
      });

      expect(sentNotifications).toHaveLength(0);
      expect(sendEmail).not.toHaveBeenCalled();
    });

    test('should handle notification sending failures gracefully', async () => {
      // Mock email failure
      (sendEmail as jest.Mock).mockRejectedValueOnce(new Error('Email service down'));

      const pastTime = new Date();
      pastTime.setMinutes(pastTime.getMinutes() - 1);

      await prisma.notificationSchedule.create({
        data: {
          appointmentId: appointment.id,
          type: 'appointment_reminder_24h',
          scheduledFor: pastTime,
          method: 'email',
          recipient: 'test@example.com',
          subject: 'Test reminder',
          message: 'Test message',
          sent: false
        }
      });

      await processPendingNotifications();

      // Should not mark as sent if sending failed
      const sentNotifications = await prisma.notificationSchedule.findMany({
        where: { 
          appointmentId: appointment.id,
          sent: true
        }
      });

      expect(sentNotifications).toHaveLength(0);
    });
  });

  describe('Scheduled Jobs Service', () => {
    test('should initialize scheduled jobs', () => {
      scheduledJobService.initialize();
      const jobStatus = scheduledJobService.getJobStatus();
      
      expect(jobStatus.length).toBeGreaterThan(0);
      expect(jobStatus.some(job => job.name === 'process-notifications')).toBe(true);
      expect(jobStatus.some(job => job.name === 'cleanup-notifications')).toBe(true);
    });

    test('should stop and start jobs', () => {
      scheduledJobService.initialize();
      
      let jobStatus = scheduledJobService.getJobStatus();
      const initialJobCount = jobStatus.length;
      
      scheduledJobService.stopJob('process-notifications');
      
      jobStatus = scheduledJobService.getJobStatus();
      expect(jobStatus.length).toBe(initialJobCount - 1);
      
      scheduledJobService.stopAll();
      
      jobStatus = scheduledJobService.getJobStatus();
      expect(jobStatus.length).toBe(0);
    });
  });
});
