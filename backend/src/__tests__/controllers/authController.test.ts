import { Request, Response } from 'express';
import { login, logout, getSession } from '../../controllers/authController';
import { createMockRequest, createMockResponse, createTestUser, cleanupDatabase, prisma } from '../utils/testHelpers';
import bcrypt from 'bcryptjs';

describe('AuthController', () => {
  beforeEach(async () => {
    await cleanupDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      // Create test user with hashed password
      const hashedPassword = await bcrypt.hash('password123', 10);
      const user = await createTestUser({
        email: 'test@example.com',
        passwordHash: hashedPassword,
        role: 'admin',
      });

      const req = createMockRequest({
        body: {
          email: 'test@example.com',
          password: 'password123',
        },
      }) as Request;

      const res = createMockResponse() as Response;

      await login(req, res);

      expect(res.cookie).toHaveBeenCalledWith(
        'token',
        expect.any(String),
        expect.objectContaining({
          httpOnly: true,
          secure: false, // test environment
          sameSite: 'lax',
          path: '/',
          maxAge: 24 * 60 * 60 * 1000,
        })
      );

      expect(res.json).toHaveBeenCalledWith({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      });
    });

    it('should fail with invalid email', async () => {
      const req = createMockRequest({
        body: {
          email: 'nonexistent@example.com',
          password: 'password123',
        },
      }) as Request;

      const res = createMockResponse() as Response;

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid email or password',
      });
    });

    it('should fail with invalid password', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      await createTestUser({
        email: 'test@example.com',
        passwordHash: hashedPassword,
      });

      const req = createMockRequest({
        body: {
          email: 'test@example.com',
          password: 'wrongpassword',
        },
      }) as Request;

      const res = createMockResponse() as Response;

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid email or password',
      });
    });

    it('should fail with missing credentials', async () => {
      const req = createMockRequest({
        body: {},
      }) as Request;

      const res = createMockResponse() as Response;

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Email and password are required',
      });
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      const mockSession = {
        destroy: jest.fn((callback) => callback()),
      };

      const req = createMockRequest({
        session: mockSession,
      }) as Request;

      const res = createMockResponse() as Response;

      await logout(req, res);

      expect(res.clearCookie).toHaveBeenCalledWith('token', { path: '/' });
      expect(mockSession.destroy).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        message: 'Logged out successfully',
      });
    });

    it('should logout successfully without session', async () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;

      await logout(req, res);

      expect(res.clearCookie).toHaveBeenCalledWith('token', { path: '/' });
      expect(res.json).toHaveBeenCalledWith({
        message: 'Logged out successfully',
      });
    });
  });

  describe('getSession', () => {
    it('should return user session data', async () => {
      const user = await createTestUser({
        email: 'test@example.com',
        role: 'admin',
      });

      const req = createMockRequest() as Request;
      (req as any).user = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      };

      const res = createMockResponse() as Response;

      await getSession(req, res);

      expect(res.json).toHaveBeenCalledWith({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      });
    });
  });
});
