import { Request, Response, NextFunction } from 'express';
import { authMiddleware, requireAdmin } from '../../middleware/auth';
import { createMockRequest, createMockResponse, createTestUser, generateTestToken, cleanupDatabase, prisma } from '../utils/testHelpers';

describe('Auth Middleware', () => {
  beforeEach(async () => {
    await cleanupDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('authMiddleware', () => {
    it('should authenticate user with valid token in cookies', async () => {
      const user = await createTestUser({ role: 'admin' });
      const token = generateTestToken(user.id, user.role);

      const req = createMockRequest({
        cookies: { token },
      }) as Request;
      const res = createMockResponse() as Response;
      const next = jest.fn() as NextFunction;

      await authMiddleware(req, res, next);

      expect((req as any).user).toMatchObject({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      });
      expect(next).toHaveBeenCalled();
    });

    it('should authenticate user with valid token in Authorization header', async () => {
      const user = await createTestUser({ role: 'tailor' });
      const token = generateTestToken(user.id, user.role);

      const req = createMockRequest({
        headers: {
          authorization: `Bearer ${token}`,
        },
      }) as Request;
      const res = createMockResponse() as Response;
      const next = jest.fn() as NextFunction;

      await authMiddleware(req, res, next);

      expect((req as any).user).toMatchObject({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      });
      expect(next).toHaveBeenCalled();
    });

    it('should return 401 when no token provided', async () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = jest.fn() as NextFunction;

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'No token provided',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 with invalid token', async () => {
      const req = createMockRequest({
        cookies: { token: 'invalid-token' },
      }) as Request;
      const res = createMockResponse() as Response;
      const next = jest.fn() as NextFunction;

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid token',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when user not found', async () => {
      const token = generateTestToken(999, 'admin'); // Non-existent user

      const req = createMockRequest({
        cookies: { token },
      }) as Request;
      const res = createMockResponse() as Response;
      const next = jest.fn() as NextFunction;

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'User not found',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should require Lightspeed connection for specific endpoints', async () => {
      const user = await createTestUser({ role: 'admin' });
      const token = generateTestToken(user.id, user.role);

      const req = createMockRequest({
        cookies: { token },
        originalUrl: '/api/customers/create',
        session: {}, // No lsAccessToken
      }) as Request;
      const res = createMockResponse() as Response;
      const next = jest.fn() as NextFunction;

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Lightspeed connection required for this action.',
        errorCode: 'LS_AUTH_REQUIRED',
        redirectTo: '/lightspeed-account',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow access to Lightspeed endpoints with valid session', async () => {
      const user = await createTestUser({ role: 'admin' });
      const token = generateTestToken(user.id, user.role);

      const req = createMockRequest({
        cookies: { token },
        originalUrl: '/api/customers/create',
        session: { lsAccessToken: 'valid-token' },
      }) as Request;
      const res = createMockResponse() as Response;
      const next = jest.fn() as NextFunction;

      await authMiddleware(req, res, next);

      expect((req as any).user).toMatchObject({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      });
      expect(next).toHaveBeenCalled();
    });
  });

  describe('requireAdmin', () => {
    it('should allow access for admin users', () => {
      const req = createMockRequest() as Request;
      (req as any).user = { role: 'admin' };
      const res = createMockResponse() as Response;
      const next = jest.fn() as NextFunction;

      requireAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny access for non-admin users', () => {
      const req = createMockRequest() as Request;
      (req as any).user = { role: 'tailor' };
      const res = createMockResponse() as Response;
      const next = jest.fn() as NextFunction;

      requireAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Forbidden: Requires admin privileges',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should deny access when no user is set', () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = jest.fn() as NextFunction;

      requireAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Forbidden: Requires admin privileges',
      });
      expect(next).not.toHaveBeenCalled();
    });
  });
});
