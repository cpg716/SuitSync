import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';

export const prisma = new PrismaClient().$extends(withAccelerate());

// Test user factory
export const createTestUser = async (overrides: any = {}) => {
  return await prisma.user.create({
    data: {
      email: `test-${Date.now()}@example.com`,
      name: 'Test User',
      role: 'tailor',
      passwordHash: 'hashed-password',
      ...overrides,
    },
  });
};

// Test customer factory
export const createTestCustomer = async (overrides: any = {}) => {
  return await prisma.customer.create({
    data: {
      name: 'Test Customer',
      email: `customer-${Date.now()}@example.com`,
      phone: '+1234567890',
      lightspeedId: `ls-${Date.now()}`,
      ...overrides,
    },
  });
};

// Test party factory
export const createTestParty = async (customerId: number, overrides: any = {}) => {
  return await prisma.party.create({
    data: {
      name: 'Test Wedding',
      eventDate: new Date('2024-12-31'),
      customerId,
      ...overrides,
    },
  });
};

// Test alteration job factory
export const createTestAlterationJob = async (overrides: any = {}) => {
  const customer = await createTestCustomer();
  return await prisma.alterationJob.create({
    data: {
      jobNumber: `JOB-${Date.now()}`,
      customerId: customer.id,
      status: 'NOT_STARTED',
      orderStatus: 'ALTERATION_ONLY',
      qrCode: `QR-${Date.now()}`,
      ...overrides,
    },
  });
};

// JWT token generator for tests
export const generateTestToken = (userId: number, role: string = 'tailor') => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET || 'test-jwt-secret',
    { expiresIn: '1h' }
  );
};

// Mock request/response helpers
export const createMockRequest = (overrides: any = {}): Partial<Request> => {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    cookies: {},
    session: {} as any,
    ...overrides,
  };
};

export const createMockResponse = (): Partial<Response> => {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
  };
  return res;
};

// Database cleanup helper
export const cleanupDatabase = async () => {
  const tablenames = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname='public'
  `;

  for (const { tablename } of tablenames) {
    if (tablename !== '_prisma_migrations') {
      try {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "public"."${tablename}" CASCADE;`);
      } catch (error) {
        console.log(`Could not truncate ${tablename}, probably doesn't exist.`);
      }
    }
  }
};

// Mock Lightspeed client
export const createMockLightspeedClient = () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
});

// Test data generators
export const generateTestCustomerData = () => ({
  firstName: 'John',
  lastName: 'Doe',
  Contact: {
    Emails: {
      Email: [{ address: `test-${Date.now()}@example.com`, type: 'primary' }],
    },
    Phones: {
      Phone: [{ number: '+1234567890', type: 'mobile' }],
    },
  },
});

export const generateTestPartyData = () => ({
  name: 'Test Wedding Party',
  eventDate: '2024-12-31T18:00:00Z',
  notes: 'Test party notes',
});
