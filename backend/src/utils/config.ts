import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

const envSchema = z.object({
  NODE_ENV: z.string().default('development'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  FRONTEND_URL: z.string().url('FRONTEND_URL must be a valid URL'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  PORT: z.coerce.number().default(3000),
  
  // Installation Type Configuration
  SUITSYNC_INSTALL_TYPE: z.enum(['server', 'pc', 'mobile']).default('server'),
  SUITSYNC_SERVER_URL: z.string().url().optional(), // Required for PC and Mobile installations
  SUITSYNC_INSTANCE_ID: z.string().optional(), // Unique identifier for this installation
  SUITSYNC_LOCATION_NAME: z.string().optional(), // Your business location name
  
  // Lightspeed X-Series API (only for server installations)
  LS_CLIENT_ID: z.string().optional(),
  LS_CLIENT_SECRET: z.string().optional(),
  LS_REDIRECT_URI: z.string().url().optional(),
  LS_ACCOUNT_ID: z.string().optional(),
  // Required by our integration rules and OAuth flow
  LS_DOMAIN: z.string().optional(),
  
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

// Installation type validation
if (config.SUITSYNC_INSTALL_TYPE === 'server') {
  if (!config.LS_CLIENT_ID || !config.LS_CLIENT_SECRET || !config.LS_REDIRECT_URI || !config.LS_DOMAIN) {
    console.error('❌ Server installations require LS_CLIENT_ID, LS_CLIENT_SECRET, LS_REDIRECT_URI, and LS_DOMAIN');
    process.exit(1);
  }
} else if (config.SUITSYNC_INSTALL_TYPE === 'pc' || config.SUITSYNC_INSTALL_TYPE === 'mobile') {
  if (!config.SUITSYNC_SERVER_URL) {
    console.error('❌ PC and Mobile installations require SUITSYNC_SERVER_URL');
    process.exit(1);
  }
}

// Installation type helper functions
export const isServerInstallation = () => config.SUITSYNC_INSTALL_TYPE === 'server';
export const isPCInstallation = () => config.SUITSYNC_INSTALL_TYPE === 'pc';
export const isMobileInstallation = () => config.SUITSYNC_INSTALL_TYPE === 'mobile';
export const isClientInstallation = () => config.SUITSYNC_INSTALL_TYPE === 'pc' || config.SUITSYNC_INSTALL_TYPE === 'mobile';

// Get installation info
export const getInstallationInfo = () => ({
  type: config.SUITSYNC_INSTALL_TYPE,
  instanceId: config.SUITSYNC_INSTANCE_ID || 'unknown',
  locationName: config.SUITSYNC_LOCATION_NAME || 'Your Business',
  serverUrl: config.SUITSYNC_SERVER_URL,
  isServer: isServerInstallation(),
  isPC: isPCInstallation(),
  isMobile: isMobileInstallation(),
  isClient: isClientInstallation(),
  supportsMultiUser: isServerInstallation() || isPCInstallation(),
  supportsLightspeedSync: isServerInstallation(),
  requiresServerConnection: isClientInstallation(),
  isSingleLocation: true, // Always true for your business
}); 