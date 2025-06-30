import { Request, Response } from 'express';
import { listCustomers, getCustomer, createCustomer } from '../../controllers/customersController';
import { createMockRequest, createMockResponse, createTestUser, createTestCustomer, cleanupDatabase, prisma, createMockLightspeedClient } from '../utils/testHelpers';

// Mock the Lightspeed client
jest.mock('../../lightspeedClient', () => ({
  createLightspeedClient: jest.fn(),
}));

describe('CustomersController', () => {
  beforeEach(async () => {
    await cleanupDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('listCustomers', () => {
    it('should return list of customers', async () => {
      // Create test customers
      const customer1 = await createTestCustomer({ name: 'John Doe' });
      const customer2 = await createTestCustomer({ name: 'Jane Smith' });

      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;

      await listCustomers(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: customer1.id,
            name: 'John Doe',
          }),
          expect.objectContaining({
            id: customer2.id,
            name: 'Jane Smith',
          }),
        ])
      );
    });

    it('should return empty array when no customers exist', async () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;

      await listCustomers(req, res);

      expect(res.json).toHaveBeenCalledWith([]);
    });

    it('should handle search query', async () => {
      await createTestCustomer({ name: 'John Doe', email: 'john@example.com' });
      await createTestCustomer({ name: 'Jane Smith', email: 'jane@example.com' });

      const req = createMockRequest({
        query: { search: 'john' },
      }) as Request;
      const res = createMockResponse() as Response;

      await listCustomers(req, res);

      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseData).toHaveLength(1);
      expect(responseData[0]).toMatchObject({
        name: 'John Doe',
        email: 'john@example.com',
      });
    });
  });

  describe('getCustomer', () => {
    it('should return customer by id', async () => {
      const customer = await createTestCustomer({
        name: 'John Doe',
        email: 'john@example.com',
      });

      const req = createMockRequest({
        params: { id: customer.id.toString() },
      }) as Request;
      const res = createMockResponse() as Response;

      await getCustomer(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: customer.id,
          name: 'John Doe',
          email: 'john@example.com',
        })
      );
    });

    it('should return 404 for non-existent customer', async () => {
      const req = createMockRequest({
        params: { id: '999' },
      }) as Request;
      const res = createMockResponse() as Response;

      await getCustomer(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Customer not found',
      });
    });

    it('should return 400 for invalid id', async () => {
      const req = createMockRequest({
        params: { id: 'invalid' },
      }) as Request;
      const res = createMockResponse() as Response;

      await getCustomer(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid customer ID',
      });
    });
  });

  describe('createCustomer', () => {
    it('should create customer successfully', async () => {
      const user = await createTestUser();
      const mockLightspeedClient = createMockLightspeedClient();
      
      // Mock successful Lightspeed response
      mockLightspeedClient.post.mockResolvedValue({
        data: {
          data: {
            id: 'ls-123',
            version: '1',
          },
        },
      });

      const { createLightspeedClient } = require('../../lightspeedClient');
      createLightspeedClient.mockReturnValue(mockLightspeedClient);

      const req = createMockRequest({
        body: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
        },
        session: { lsAccessToken: 'mock-token' },
      }) as Request;
      (req as any).user = user;

      const res = createMockResponse() as Response;

      await createCustomer(req, res);

      expect(mockLightspeedClient.post).toHaveBeenCalledWith(
        '/customers',
        expect.objectContaining({
          firstName: 'John',
          lastName: 'Doe',
          Contact: expect.objectContaining({
            Emails: {
              Email: [{ address: 'john@example.com', type: 'primary' }],
            },
            Phones: {
              Phone: [{ number: '+1234567890', type: 'mobile' }],
            },
          }),
        })
      );

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          lightspeedId: 'ls-123',
        })
      );
    });

    it('should return 409 for duplicate email', async () => {
      await createTestCustomer({ email: 'john@example.com' });

      const req = createMockRequest({
        body: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      }) as Request;
      const res = createMockResponse() as Response;

      await createCustomer(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        error: 'A customer with this email already exists in SuitSync.',
      });
    });

    it('should return 400 for missing required fields', async () => {
      const req = createMockRequest({
        body: {},
      }) as Request;
      const res = createMockResponse() as Response;

      await createCustomer(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Name and email are required',
      });
    });
  });
});
