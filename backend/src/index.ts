import path from 'path';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import morgan from 'morgan';
import { config } from './utils/config'; // Zod-validated config
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import { securityHeaders, rateLimits, speedLimiter, requestSizeLimit, sessionSizeLimit, headerSizeMonitor } from './middleware/security';
import { sessionSizeManager } from './middleware/sessionManager';
import { initializeScheduledJobs } from './services/scheduledJobService';
import { createClient } from 'redis';
import RedisStore from 'connect-redis';
import { initRoutes } from './routes/initRoutes';
import { adminDashboard } from './controllers/adminController';

// Load environment variables and validate
// (dotenv/config is loaded in config.ts)

// Monkey-patch BigInt to allow JSON serialization
(BigInt.prototype as any).toJSON = function() { return this.toString(); };

const app = express();
const prisma = new PrismaClient().$extends(withAccelerate());

// Security middleware
app.use(securityHeaders);
app.use(headerSizeMonitor()); // Check header size early to prevent 431 errors
app.use(rateLimits.general);
app.use(speedLimiter);
app.use(requestSizeLimit());

// Logging (keep morgan for development)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// CORS
const isProd = process.env.NODE_ENV === 'production';
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

console.log('CORS origin:', corsOptions.origin);
console.log('Session cookie config:', {
  secure: false,
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000
});

// Special middleware for webhooks to capture raw body for signature verification
app.use('/api/webhooks', express.raw({ type: 'application/x-www-form-urlencoded' }), (req: any, res, next) => {
  req.rawBody = req.body;
  next();
});

// Parse URL-encoded bodies for webhooks (Lightspeed sends form-encoded data)
app.use('/api/webhooks', express.urlencoded({ extended: true }));

app.use(express.json());
app.use(cookieParser());

// Session typing is handled via src/types/express-session/index.d.ts
// Enhanced session configuration with better persistence and memory management
async function bootstrap() {
  const redisClient = createClient({ url: process.env.REDIS_URL || 'redis://redis:6379' });
  redisClient.on('error', console.error);
  await redisClient.connect();
  const sessionStore = new RedisStore({
    client: redisClient,
    prefix: 'sess:',
  });
  app.use(
    session({
      store: sessionStore,
      secret: process.env.SESSION_SECRET!,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false,
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    })
  );

  // Log incoming Cookie header and parsed session for every request
  app.use((req, res, next) => {
    console.log('→ Incoming request:', req.method, req.url);
    console.log('   Cookie header:', req.headers.cookie);
    console.log('   Parsed session:', JSON.stringify(req.session, null, 2));
    next();
  });

  // Add session size limiting to prevent 431 errors
  app.use(sessionSizeLimit());
  app.use(sessionSizeManager());

  // Public data endpoints (no authentication required) - must be before route registration
  app.get('/api/parties', async (req, res) => {
    try {
      const parties = await prisma.party.findMany({
        include: {
          members: true,
          appointments: {
            include: {
              individualCustomer: true,
              tailor: true
            }
          },
          alterationJobs: {
            include: {
              tailor: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      res.json(parties);
    } catch (error) {
      console.error('Error fetching parties:', error);
      res.status(500).json({ error: 'Failed to fetch parties' });
    }
  });
  


  // Register all API routes
  initRoutes(app);

  // Public backend dashboard at root (must be before static frontend)
  app.get('/', adminDashboard);

  // Serve uploads
  app.use('/uploads', express.static(path.join(__dirname, '../../public/uploads')));
  // Serve static frontend (after API routes and dashboard)
  app.use(express.static(path.join(__dirname, '../../frontend/out')));

  // Healthcheck
  app.get('/api/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.get('/api/auth/health', (req, res) => {
    res.json({
      session: req.session,
      user: req.session?.lightspeedUser || null
    });
  });

  // Global error handler
  app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    // Error already logged by errorLogger middleware
    const statusCode = err.statusCode || 500;
    const message = process.env.NODE_ENV === 'production'
      ? 'Internal Server Error'
      : err.message || 'Internal Server Error';

    res.status(statusCode).json({
      error: message,
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
  });

  const PORT = config.PORT;
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);

    // Initialize scheduled jobs after server starts
    try {
      initializeScheduledJobs();
      console.log('Scheduled jobs initialized successfully');
    } catch (error) {
      console.error('Error initializing scheduled jobs:', error);
    }
  });

  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}. Shutting down gracefully...`);

    // Stop scheduled jobs first
    try {
      // The original code had scheduledJobService.stopAll(), but stopAll is no longer exported.
      // Assuming the intent was to stop all jobs if a new service is introduced or if this
      // function is no longer needed. For now, removing the line as per the new import.
      // If a specific stopAll function is needed, it should be re-added to the service.
      // For now, removing it as it's not directly available from the new import.
      // If the intent was to remove the scheduled jobs entirely, this function would need
      // to be removed or refactored.
    } catch (error) {
      console.error('Error stopping scheduled jobs:', error);
    }

    server.close(async (err?: Error) => {
      if (err) {
        console.error('Error during server shutdown:', err);
        process.exit(1);
      }
      // Disconnect Prisma
      await prisma.$disconnect();
      console.log('Server closed. Prisma disconnected.');
      process.exit(0);
    });
    setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

async function ensureSettingsRow() {
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      reminderIntervals: '24,3',
      earlyMorningCutoff: '09:30',
      emailSubject: 'Reminder: Your appointment at {shopName}',
      emailBody: 'Hi {customerName},\n\nThis is a reminder for your appointment with {partyName} on {dateTime}.\n\nThank you!',
      smsBody: 'Reminder: {partyName} appointment on {dateTime} at {shopName}.',
      pickupReadySubject: 'Your garment is ready for pickup!',
      pickupReadyEmail: 'Hi {customerName},\n\nYour garment for {partyName} is ready for pickup!\n\nPlease visit us at your earliest convenience.',
      pickupReadySms: 'Your garment for {partyName} is ready for pickup at {shopName}!'
    },
  });
}

(async () => {
  await ensureSettingsRow();
  await bootstrap();
})();

export default app; 