import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { authMiddleware } from '../../middleware/auth';
import authRoutes from '../../routes/auth';
import { createTestUser, cleanupDatabase, prisma } from '../utils/testHelpers';
import bcrypt from 'bcryptjs';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRoutes);

// Protected route for testing
app.get('/api/protected', authMiddleware, (req, res) => {
  res.json({ message: 'Protected route accessed', user: (req as any).user });
});

describe('Auth Integration Tests', () => {
  beforeEach(async () => {
    await cleanupDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully and set cookie', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const user = await createTestUser({
        email: 'test@example.com',
        passwordHash: hashedPassword,
        role: 'admin',
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(200);

      expect(response.body).toMatchObject({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      });

      // Check that cookie is set
      expect(response.headers['set-cookie']).toBeDefined();
      const cookieHeader = response.headers['set-cookie'][0];
      expect(cookieHeader).toMatch(/^token=/);
      expect(cookieHeader).toMatch(/HttpOnly/);
    });

    it('should fail with invalid credentials', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully and clear cookie', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Logged out successfully',
      });

      // Check that cookie is cleared
      expect(response.headers['set-cookie']).toBeDefined();
      const cookieHeader = response.headers['set-cookie'][0];
      expect(cookieHeader).toMatch(/token=;/);
    });
  });

  describe('GET /api/auth/session', () => {
    it('should return session data for authenticated user', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const user = await createTestUser({
        email: 'test@example.com',
        passwordHash: hashedPassword,
        role: 'admin',
      });

      // Login first to get token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      const cookies = loginResponse.headers['set-cookie'];

      // Get session
      const response = await request(app)
        .get('/api/auth/session')
        .set('Cookie', cookies)
        .expect(200);

      expect(response.body).toMatchObject({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      });
    });

    it('should return 401 for unauthenticated user', async () => {
      await request(app)
        .get('/api/auth/session')
        .expect(401);
    });
  });

  describe('Protected Route Access', () => {
    it('should access protected route with valid token', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const user = await createTestUser({
        email: 'test@example.com',
        passwordHash: hashedPassword,
        role: 'admin',
      });

      // Login first to get token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      const cookies = loginResponse.headers['set-cookie'];

      // Access protected route
      const response = await request(app)
        .get('/api/protected')
        .set('Cookie', cookies)
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Protected route accessed',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    });

    it('should deny access to protected route without token', async () => {
      await request(app)
        .get('/api/protected')
        .expect(401);
    });
  });
});
