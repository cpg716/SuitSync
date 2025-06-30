import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { randomBytes } from 'crypto';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-session-secret';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.FRONTEND_URL = 'http://localhost:3001';
process.env.LS_DOMAIN = 'test';
process.env.LS_CLIENT_ID = 'test-client-id';
process.env.LS_CLIENT_SECRET = 'test-client-secret';
process.env.LS_REDIRECT_URI = 'http://localhost:3000/api/auth/callback';

// Create a unique test database URL
const testDbName = `suitsync_test_${randomBytes(8).toString('hex')}`;
process.env.DATABASE_URL = `postgresql://suitsync:supersecret@localhost:5432/${testDbName}`;

// Global test utilities
global.testDbName = testDbName;

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

// Restore console for specific tests if needed
global.restoreConsole = () => {
  global.console = originalConsole;
};

// Mock BigInt serialization
(BigInt.prototype as any).toJSON = function() { 
  return this.toString(); 
};

// Setup test database before each test file
beforeAll(async () => {
  // Create test database
  try {
    execSync(`createdb ${testDbName}`, { stdio: 'ignore' });
  } catch (error) {
    // Database might already exist
  }

  // Run migrations
  execSync('npx prisma migrate deploy', { 
    stdio: 'ignore',
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }
  });
});

// Cleanup after each test file
afterAll(async () => {
  // Drop test database
  try {
    execSync(`dropdb ${testDbName}`, { stdio: 'ignore' });
  } catch (error) {
    // Database might not exist
  }
});
