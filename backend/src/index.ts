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
// Using default memory store for now - TODO: Fix PrismaSessionStore configuration
app.use(
  session({
    secret: config.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    },
  })
);

// Add session size limiting to prevent 431 errors
app.use(sessionSizeLimit());

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
});

const shutdown = async (signal: string) => {
  console.log(`Received ${signal}. Shutting down gracefully...`);
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