import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import { executeWorkflowTriggers } from '../../services/appointmentWorkflowService';
import { getAppointmentProgress, getPartyProgress } from '../../services/appointmentProgressService';
import { scheduleAppointmentReminders } from '../../services/notificationSchedulingService';
import {
  createTestUser,
  createTestCustomer,
  createTestParty,
  cleanupDatabase,
  prisma
} from '../utils/testHelpers';

describe('Appointment Workflow Integration Tests', () => {
  beforeEach(async () => {
    await cleanupDatabase();
  });

  afterAll(async () => {
    await cleanupDatabase();
    await prisma.$disconnect();
  });

  describe('Wedding Timeline Workflow', () => {
    let customer: any;
    let party: any;
    let member: any;
    let tailor: any;

    beforeEach(async () => {
      customer = await createTestCustomer();
      party = await createTestParty(customer.id, {
        eventDate: new Date('2024-12-31T18:00:00Z')
      });
      
      member = await prisma.partyMember.create({
        data: {
          partyId: party.id,
          role: 'Groom',
          lsCustomerId: customer.lightspeedId
        }
      });

      tailor = await createTestUser({ role: 'tailor' });
    });

    test('should create first fitting appointment and track progress', async () => {
      // Create first fitting appointment
      const appointment = await prisma.appointment.create({
        data: {
          partyId: party.id,
          memberId: member.id,
          dateTime: new Date('2024-10-01T10:00:00Z'),
          type: 'first_fitting',
          status: 'scheduled',
          durationMinutes: 90,
          tailorId: tailor.id,
          workflowStage: 1,
          autoScheduleNext: true
        }
      });

      // Check initial progress
      const initialProgress = await getAppointmentProgress(undefined, member.id);
      expect(initialProgress).toBeTruthy();
      expect(initialProgress!.currentStage).toBe(1);
      expect(initialProgress!.completedStages).toHaveLength(0);
      expect(initialProgress!.nextStage).toBe('first_fitting');

      // Complete the appointment
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { status: 'completed' }
      });

      // Execute workflow triggers
      const workflowResult = await executeWorkflowTriggers(appointment.id);
      
      expect(workflowResult.success).toBe(true);
      expect(workflowResult.actions).toContain(
        expect.stringMatching(/Auto-scheduled.*Alterations Fitting/)
      );
      expect(workflowResult.nextAppointmentId).toBeDefined();

      // Check updated progress
      const updatedProgress = await getAppointmentProgress(undefined, member.id);
      expect(updatedProgress!.completedStages).toContain('first_fitting');
      expect(updatedProgress!.nextStage).toBe('alterations_fitting');

      // Verify next appointment was created
      const nextAppointment = await prisma.appointment.findUnique({
        where: { id: workflowResult.nextAppointmentId! }
      });
      expect(nextAppointment).toBeTruthy();
      expect(nextAppointment!.type).toBe('alterations_fitting');
      expect(nextAppointment!.parentId).toBe(appointment.id);
    });

    test('should create alteration job after alterations fitting', async () => {
      // Create and complete first fitting
      const firstFitting = await prisma.appointment.create({
        data: {
          partyId: party.id,
          memberId: member.id,
          dateTime: new Date('2024-10-01T10:00:00Z'),
          type: 'first_fitting',
          status: 'completed',
          durationMinutes: 90,
          workflowStage: 1
        }
      });

      // Create alterations fitting
      const alterationsFitting = await prisma.appointment.create({
        data: {
          partyId: party.id,
          memberId: member.id,
          dateTime: new Date('2024-11-15T10:00:00Z'),
          type: 'alterations_fitting',
          status: 'completed',
          durationMinutes: 60,
          workflowStage: 2,
          parentId: firstFitting.id
        }
      });

      // Execute workflow triggers
      const workflowResult = await executeWorkflowTriggers(alterationsFitting.id);
      
      expect(workflowResult.success).toBe(true);
      expect(workflowResult.actions).toContain(
        expect.stringMatching(/Created alteration job/)
      );
      expect(workflowResult.alterationJobId).toBeDefined();

      // Verify alteration job was created
      const alterationJob = await prisma.alterationJob.findUnique({
        where: { id: workflowResult.alterationJobId! }
      });
      expect(alterationJob).toBeTruthy();
      expect(alterationJob!.partyMemberId).toBe(member.id);
      expect(alterationJob!.status).toBe('pending');
    });

    test('should complete full wedding timeline workflow', async () => {
      // Create first fitting
      const firstFitting = await prisma.appointment.create({
        data: {
          partyId: party.id,
          memberId: member.id,
          dateTime: new Date('2024-10-01T10:00:00Z'),
          type: 'first_fitting',
          status: 'completed',
          durationMinutes: 90,
          workflowStage: 1
        }
      });

      // Create alterations fitting
      const alterationsFitting = await prisma.appointment.create({
        data: {
          partyId: party.id,
          memberId: member.id,
          dateTime: new Date('2024-11-15T10:00:00Z'),
          type: 'alterations_fitting',
          status: 'completed',
          durationMinutes: 60,
          workflowStage: 2,
          parentId: firstFitting.id
        }
      });

      // Create pickup appointment
      const pickup = await prisma.appointment.create({
        data: {
          partyId: party.id,
          memberId: member.id,
          dateTime: new Date('2024-12-24T10:00:00Z'),
          type: 'pickup',
          status: 'completed',
          durationMinutes: 30,
          workflowStage: 3,
          parentId: alterationsFitting.id
        }
      });

      // Check final progress
      const finalProgress = await getAppointmentProgress(undefined, member.id);
      expect(finalProgress!.isComplete).toBe(true);
      expect(finalProgress!.completedStages).toHaveLength(3);
      expect(finalProgress!.completedStages).toContain('first_fitting');
      expect(finalProgress!.completedStages).toContain('alterations_fitting');
      expect(finalProgress!.completedStages).toContain('pickup');
      expect(finalProgress!.nextStage).toBeUndefined();
    });

    test('should track party progress across multiple members', async () => {
      // Create second member
      const member2 = await prisma.partyMember.create({
        data: {
          partyId: party.id,
          role: 'Best Man',
          lsCustomerId: `${customer.lightspeedId}-2`
        }
      });

      // Create appointments for first member
      await prisma.appointment.create({
        data: {
          partyId: party.id,
          memberId: member.id,
          dateTime: new Date('2024-10-01T10:00:00Z'),
          type: 'first_fitting',
          status: 'completed',
          durationMinutes: 90
        }
      });

      // Create appointments for second member
      await prisma.appointment.create({
        data: {
          partyId: party.id,
          memberId: member2.id,
          dateTime: new Date('2024-10-01T11:00:00Z'),
          type: 'first_fitting',
          status: 'scheduled',
          durationMinutes: 90
        }
      });

      // Check party progress
      const partyProgress = await getPartyProgress(party.id);
      expect(partyProgress.party.id).toBe(party.id);
      expect(partyProgress.memberProgress).toHaveLength(2);
      expect(partyProgress.overallProgress.totalMembers).toBe(2);
      expect(partyProgress.overallProgress.inProgressMembers).toBe(1);
      expect(partyProgress.overallProgress.completedMembers).toBe(0);
    });
  });

  describe('Individual Customer Workflow', () => {
    let customer: any;
    let tailor: any;

    beforeEach(async () => {
      customer = await createTestCustomer();
      tailor = await createTestUser({ role: 'tailor' });
    });

    test('should handle individual customer appointments', async () => {
      // Create individual customer appointment
      const appointment = await prisma.appointment.create({
        data: {
          individualCustomerId: customer.id,
          dateTime: new Date('2024-10-01T10:00:00Z'),
          type: 'first_fitting',
          status: 'scheduled',
          durationMinutes: 90,
          tailorId: tailor.id,
          workflowStage: 1,
          autoScheduleNext: true
        }
      });

      // Check progress
      const progress = await getAppointmentProgress(customer.id);
      expect(progress).toBeTruthy();
      expect(progress!.customerId).toBe(customer.id);
      expect(progress!.currentStage).toBe(1);

      // Complete appointment and trigger workflow
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { status: 'completed' }
      });

      const workflowResult = await executeWorkflowTriggers(appointment.id);
      expect(workflowResult.success).toBe(true);
      expect(workflowResult.nextAppointmentId).toBeDefined();

      // Verify next appointment for individual customer
      const nextAppointment = await prisma.appointment.findUnique({
        where: { id: workflowResult.nextAppointmentId! }
      });
      expect(nextAppointment!.individualCustomerId).toBe(customer.id);
      expect(nextAppointment!.type).toBe('alterations_fitting');
    });
  });

  describe('Notification Scheduling', () => {
    let customer: any;
    let party: any;
    let member: any;

    beforeEach(async () => {
      customer = await createTestCustomer({
        email: 'test@example.com',
        phone: '+1234567890'
      });
      party = await createTestParty(customer.id);
      member = await prisma.partyMember.create({
        data: {
          partyId: party.id,
          role: 'Groom',
          lsCustomerId: customer.lightspeedId
        }
      });

      // Create default settings
      await prisma.settings.upsert({
        where: { id: 1 },
        update: {},
        create: {
          id: 1,
          reminderIntervals: '24,3',
          earlyMorningCutoff: '09:30',
          emailSubject: 'Test reminder',
          emailBody: 'Test body',
          smsBody: 'Test SMS'
        }
      });
    });

    test('should schedule appointment reminders', async () => {
      // Create future appointment
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7); // 7 days from now

      const appointment = await prisma.appointment.create({
        data: {
          partyId: party.id,
          memberId: member.id,
          dateTime: futureDate,
          type: 'first_fitting',
          status: 'scheduled',
          durationMinutes: 90
        }
      });

      // Schedule reminders
      await scheduleAppointmentReminders(appointment.id);

      // Check that reminders were scheduled
      const scheduledNotifications = await prisma.notificationSchedule.findMany({
        where: { appointmentId: appointment.id }
      });

      expect(scheduledNotifications.length).toBeGreaterThan(0);
      
      // Should have both email and SMS reminders
      const emailReminders = scheduledNotifications.filter(n => n.method === 'email');
      const smsReminders = scheduledNotifications.filter(n => n.method === 'sms');
      
      expect(emailReminders.length).toBeGreaterThan(0);
      expect(smsReminders.length).toBeGreaterThan(0);

      // Check reminder timing
      const reminderTimes = scheduledNotifications.map(n => n.scheduledFor);
      expect(reminderTimes.some(time => 
        Math.abs(time.getTime() - (futureDate.getTime() - 24 * 60 * 60 * 1000)) < 60000
      )).toBe(true); // 24h reminder within 1 minute
    });

    test('should handle early morning appointment reminders', async () => {
      // Create early morning appointment (9:00 AM)
      const earlyMorningDate = new Date();
      earlyMorningDate.setDate(earlyMorningDate.getDate() + 7);
      earlyMorningDate.setHours(9, 0, 0, 0);

      const appointment = await prisma.appointment.create({
        data: {
          partyId: party.id,
          memberId: member.id,
          dateTime: earlyMorningDate,
          type: 'first_fitting',
          status: 'scheduled',
          durationMinutes: 90
        }
      });

      await scheduleAppointmentReminders(appointment.id);

      const scheduledNotifications = await prisma.notificationSchedule.findMany({
        where: { appointmentId: appointment.id }
      });

      // Should have 1h reminder instead of 3h for early morning
      const oneHourReminders = scheduledNotifications.filter(n => 
        n.type === 'appointment_reminder_1h'
      );
      expect(oneHourReminders.length).toBeGreaterThan(0);
    });
  });
});
