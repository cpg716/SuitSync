import path from 'path';
import dotenv from 'dotenv';
import { z } from 'zod';

// Load .env from project root
const envPath = path.resolve(__dirname, '../../../.env');
dotenv.config({ path: envPath });

const envSchema = z.object({
  NODE_ENV: z.string().default('development'),
  SESSION_SECRET: z.string().min(1, 'SESSION_SECRET is required'),
  FRONTEND_URL: z.string().url('FRONTEND_URL must be a valid URL'),
  PORT: z.coerce.number().default(3000),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  // Print all validation errors and exit
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data; 