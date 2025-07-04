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
import { scheduledJobService } from './services/scheduledJobService';
import Redis from 'redis';
import connectRedis from 'connect-redis';

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
const corsOptions = {
  origin: config.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

console.log('CORS origin:', corsOptions.origin);
console.log('Session cookie config:', {
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 1000 * 60 * 60 * 24 * 7
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
let sessionStore;
try {
  const RedisStore = connectRedis(session);
  const redisClient = Redis.createClient({
    url: process.env.REDIS_URL || 'redis://redis:6379',
    legacyMode: true,
  });
  redisClient.connect().catch(console.error);
  sessionStore = new RedisStore({ client: redisClient });
  console.log('Using Redis for session storage');
} catch (err) {
  // Fallback to file store for local dev if Redis is unavailable
  sessionStore = process.env.NODE_ENV === 'development'
    ? new (require('session-file-store')(session))({
        path: '/app/sessions',
        ttl: 60 * 60 * 24 * 7,
        retries: 3,
        reapInterval: 60 * 60,
        logFn: () => {},
      })
    : undefined;
  if (sessionStore) {
    console.log('Using file store for session storage (development fallback)');
  } else {
    console.warn('No session store configured!');
  }
}
app.use(
  session({
    secret: config.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true, // Reset expiration on activity
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    },
    store: sessionStore,
  })
);

// Add session size limiting to prevent 431 errors
app.use(sessionSizeLimit());
app.use(sessionSizeManager());

// Register all API routes
import { initRoutes } from './routes/initRoutes';
initRoutes(app);

// Serve uploads
app.use('/uploads', express.static(path.join(__dirname, '../../public/uploads')));
// Serve static frontend (after API routes)
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
const server = app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);

  // Initialize scheduled jobs after server starts
  try {
    scheduledJobService.initialize();
    console.log('Scheduled jobs initialized successfully');
  } catch (error) {
    console.error('Error initializing scheduled jobs:', error);
  }
});

const shutdown = async (signal: string) => {
  console.log(`Received ${signal}. Shutting down gracefully...`);

  // Stop scheduled jobs first
  try {
    scheduledJobService.stopAll();
    console.log('Scheduled jobs stopped');
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

export default app; 