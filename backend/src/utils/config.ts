import path from 'path';
import dotenv from 'dotenv';
import { z } from 'zod';

// Load .env from project root
const envPath = path.resolve(__dirname, '../../../.env');
dotenv.config({ path: envPath });

const envSchema = z.object({
  NODE_ENV: z.string().default('development'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  FRONTEND_URL: z.string().url('FRONTEND_URL must be a valid URL'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  PORT: z.coerce.number().default(3000),
  
  // Lightspeed X-Series API
  LS_CLIENT_ID: z.string().min(1, 'LS_CLIENT_ID is required'),
  LS_CLIENT_SECRET: z.string().min(1, 'LS_CLIENT_SECRET is required'),
  LS_REDIRECT_URI: z.string().url('LS_REDIRECT_URI must be a valid URL'),
  LS_ACCOUNT_ID: z.string().optional(),
  
  // Optional services
  SENDGRID_API_KEY: z.string().optional(),
  SENDGRID_FROM: z.string().email().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  // Print all validation errors and exit
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data; 