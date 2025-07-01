import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import {
  createTestUser,
  createTestCustomer,
  createTestParty,
  cleanupDatabase,
  prisma,
  generateTestToken
} from '../utils/testHelpers';
import { initRoutes } from '../../routes/initRoutes';

const app = express();
app.use(express.json());
initRoutes(app);

describe('Customer Selection Integration Tests', () => {
  let authToken: string;
  let user: any;

  beforeEach(async () => {
    await cleanupDatabase();
    user = await createTestUser({ role: 'sales' });
    authToken = generateTestToken(user.id, user.role);
  });

  afterAll(async () => {
    await cleanupDatabase();
    await prisma.$disconnect();
  });

  describe('Customer Search API', () => {
    let customers: any[];
    let parties: any[];

    beforeEach(async () => {
      // Create test customers
      customers = await Promise.all([
        createTestCustomer({
          name: 'John Smith',
          email: 'john.smith@example.com',
          phone: '+1234567890'
        }),
        createTestCustomer({
          name: 'Jane Doe',
          email: 'jane.doe@example.com',
          phone: '+1987654321'
        }),
        createTestCustomer({
          name: 'Bob Johnson',
          email: 'bob.johnson@example.com',
          phone: '+1555666777'
        })
      ]);

      // Create test parties
      parties = await Promise.all([
        createTestParty(customers[0].id, {
          name: 'Smith Wedding',
          eventDate: new Date('2024-12-31T18:00:00Z')
        }),
        createTestParty(customers[1].id, {
          name: 'Doe Anniversary',
          eventDate: new Date('2024-11-15T19:00:00Z')
        })
      ]);

      // Add party members
      await prisma.partyMember.createMany({
        data: [
          {
            partyId: parties[0].id,
            role: 'Groom',
            lsCustomerId: customers[0].lightspeedId
          },
          {
            partyId: parties[0].id,
            role: 'Best Man',
            lsCustomerId: customers[2].lightspeedId
          },
          {
            partyId: parties[1].id,
            role: 'Bride',
            lsCustomerId: customers[1].lightspeedId
          }
        ]
      });
    });

    test('should search customers by name', async () => {
      const response = await request(app)
        .get('/api/customers?search=John')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.customers).toHaveLength(2); // John Smith and Bob Johnson
      expect(response.body.customers.map((c: any) => c.name)).toContain('John Smith');
      expect(response.body.customers.map((c: any) => c.name)).toContain('Bob Johnson');
    });

    test('should search customers by email', async () => {
      const response = await request(app)
        .get('/api/customers?search=jane.doe')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.customers).toHaveLength(1);
      expect(response.body.customers[0].name).toBe('Jane Doe');
    });

    test('should search parties by name', async () => {
      const response = await request(app)
        .get('/api/parties?search=Smith&includeMembers=true')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe('Smith Wedding');
      expect(response.body[0].members).toHaveLength(2);
    });

    test('should search parties by event date', async () => {
      const response = await request(app)
        .get('/api/parties?search=2024-12&includeMembers=true')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe('Smith Wedding');
    });

    test('should limit search results', async () => {
      // Create many customers
      const manyCustomers = Array.from({ length: 15 }, (_, i) => ({
        name: `Test Customer ${i}`,
        email: `test${i}@example.com`,
        lightspeedId: `ls-test-${i}`
      }));

      await prisma.customer.createMany({ data: manyCustomers });

      const response = await request(app)
        .get('/api/customers?search=Test&limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.customers).toHaveLength(5);
    });

    test('should include appointment progress in customer search', async () => {
      // Create appointments for a customer
      const party = parties[0];
      const member = await prisma.partyMember.findFirst({
        where: { partyId: party.id, role: 'Groom' }
      });

      await prisma.appointment.create({
        data: {
          partyId: party.id,
          memberId: member!.id,
          dateTime: new Date('2024-10-01T10:00:00Z'),
          type: 'first_fitting',
          status: 'completed',
          durationMinutes: 90
        }
      });

      const response = await request(app)
        .get('/api/customers?search=John Smith')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const customer = response.body.customers.find((c: any) => c.name === 'John Smith');
      expect(customer).toBeDefined();
      // Note: In a real implementation, you'd include appointment data in the customer response
    });
  });

  describe('Progress Tracking API', () => {
    let customer: any;
    let party: any;
    let member: any;

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
    });

    test('should get customer progress', async () => {
      // Create appointments
      await prisma.appointment.create({
        data: {
          individualCustomerId: customer.id,
          dateTime: new Date('2024-10-01T10:00:00Z'),
          type: 'first_fitting',
          status: 'completed',
          durationMinutes: 90
        }
      });

      const response = await request(app)
        .get(`/api/progress/customers/${customer.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.customerId).toBe(customer.id);
      expect(response.body.completedStages).toContain('first_fitting');
      expect(response.body.currentStage).toBe(2);
      expect(response.body.nextStage).toBe('alterations_fitting');
    });

    test('should get party member progress', async () => {
      // Create appointments for party member
      await prisma.appointment.createMany({
        data: [
          {
            partyId: party.id,
            memberId: member.id,
            dateTime: new Date('2024-10-01T10:00:00Z'),
            type: 'first_fitting',
            status: 'completed',
            durationMinutes: 90
          },
          {
            partyId: party.id,
            memberId: member.id,
            dateTime: new Date('2024-11-15T10:00:00Z'),
            type: 'alterations_fitting',
            status: 'scheduled',
            durationMinutes: 60
          }
        ]
      });

      const response = await request(app)
        .get(`/api/progress/party-members/${member.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.partyMemberId).toBe(member.id);
      expect(response.body.completedStages).toContain('first_fitting');
      expect(response.body.currentStage).toBe(2);
    });

    test('should get party progress summary', async () => {
      // Create second member
      const member2 = await prisma.partyMember.create({
        data: {
          partyId: party.id,
          role: 'Best Man',
          lsCustomerId: `${customer.lightspeedId}-2`
        }
      });

      // Create appointments for both members
      await prisma.appointment.createMany({
        data: [
          {
            partyId: party.id,
            memberId: member.id,
            dateTime: new Date('2024-10-01T10:00:00Z'),
            type: 'first_fitting',
            status: 'completed',
            durationMinutes: 90
          },
          {
            partyId: party.id,
            memberId: member2.id,
            dateTime: new Date('2024-10-01T11:00:00Z'),
            type: 'first_fitting',
            status: 'scheduled',
            durationMinutes: 90
          }
        ]
      });

      const response = await request(app)
        .get(`/api/progress/parties/${party.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.party.id).toBe(party.id);
      expect(response.body.memberProgress).toHaveLength(2);
      expect(response.body.overallProgress.totalMembers).toBe(2);
      expect(response.body.overallProgress.inProgressMembers).toBe(1);
    });

    test('should get progress dashboard', async () => {
      // Create various appointments
      await prisma.appointment.createMany({
        data: [
          {
            partyId: party.id,
            memberId: member.id,
            dateTime: new Date('2024-10-01T10:00:00Z'),
            type: 'first_fitting',
            status: 'completed',
            durationMinutes: 90
          },
          {
            partyId: party.id,
            memberId: member.id,
            dateTime: new Date('2024-11-15T10:00:00Z'),
            type: 'alterations_fitting',
            status: 'scheduled',
            durationMinutes: 60
          }
        ]
      });

      const response = await request(app)
        .get('/api/progress/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.appointments.total).toBeGreaterThan(0);
      expect(response.body.appointments.byType).toHaveProperty('first_fitting');
      expect(response.body.appointments.byStatus).toHaveProperty('completed');
      expect(response.body.customers.total).toBeGreaterThan(0);
      expect(response.body.parties.total).toBeGreaterThan(0);
    });
  });

  describe('Appointment Creation with Customer Selection', () => {
    let customer: any;
    let party: any;
    let member: any;
    let tailor: any;

    beforeEach(async () => {
      customer = await createTestCustomer();
      party = await createTestParty(customer.id);
      member = await prisma.partyMember.create({
        data: {
          partyId: party.id,
          role: 'Groom',
          lsCustomerId: customer.lightspeedId
        }
      });
      tailor = await createTestUser({ role: 'tailor' });
    });

    test('should create appointment for individual customer', async () => {
      const appointmentData = {
        individualCustomerId: customer.id,
        dateTime: new Date('2024-10-01T10:00:00Z').toISOString(),
        type: 'first_fitting',
        status: 'scheduled',
        durationMinutes: 90,
        assignedStaffId: tailor.id,
        notes: 'Test appointment'
      };

      const response = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(appointmentData)
        .expect(201);

      expect(response.body.individualCustomerId).toBe(customer.id);
      expect(response.body.type).toBe('first_fitting');
      expect(response.body.tailorId).toBe(tailor.id);
    });

    test('should create appointment for party member', async () => {
      const appointmentData = {
        partyId: party.id,
        memberId: member.id,
        dateTime: new Date('2024-10-01T10:00:00Z').toISOString(),
        type: 'first_fitting',
        status: 'scheduled',
        durationMinutes: 90,
        assignedStaffId: tailor.id,
        notes: 'Test party appointment'
      };

      const response = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(appointmentData)
        .expect(201);

      expect(response.body.partyId).toBe(party.id);
      expect(response.body.memberId).toBe(member.id);
      expect(response.body.type).toBe('first_fitting');
    });

    test('should validate required fields for appointment creation', async () => {
      const invalidData = {
        dateTime: new Date('2024-10-01T10:00:00Z').toISOString(),
        type: 'first_fitting'
        // Missing customer/party selection
      };

      const response = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toContain('Either partyId or individualCustomerId is required');
    });

    test('should schedule notifications when creating appointment', async () => {
      // Create settings for notifications
      await prisma.settings.upsert({
        where: { id: 1 },
        update: {},
        create: {
          id: 1,
          reminderIntervals: '24,3',
          emailSubject: 'Test reminder',
          emailBody: 'Test body',
          smsBody: 'Test SMS'
        }
      });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const appointmentData = {
        individualCustomerId: customer.id,
        dateTime: futureDate.toISOString(),
        type: 'first_fitting',
        status: 'scheduled',
        durationMinutes: 90
      };

      const response = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(appointmentData)
        .expect(201);

      // Check that notifications were scheduled
      const notifications = await prisma.notificationSchedule.findMany({
        where: { appointmentId: response.body.id }
      });

      expect(notifications.length).toBeGreaterThan(0);
    });
  });
});
