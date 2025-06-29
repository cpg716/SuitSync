import path from 'path';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { config } from './utils/config'; // Zod-validated config
import { PrismaClient } from '@prisma/client';
import { PrismaSessionStore } from '@quixo3/prisma-session-store';
import { withAccelerate } from '@prisma/extension-accelerate';

// Load environment variables and validate
// (dotenv/config is loaded in config.ts)

// Monkey-patch BigInt to allow JSON serialization
(BigInt.prototype as any).toJSON = function() { return this.toString(); };

const app = express();
const prisma = new PrismaClient().$extends(withAccelerate());

// Security middleware
app.use(helmet());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP
  standardHeaders: true,
  legacyHeaders: false,
}));

// Logging
app.use(morgan('dev'));

// CORS
const corsOptions = {
  origin: config.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

app.use(express.json());
app.use(cookieParser());

// Session typing is handled via src/types/express-session/index.d.ts
app.use(
  session({
    // @ts-expect-error: PrismaSessionStore expects a different type signature, but this works at runtime
    store: new PrismaSessionStore(prisma, {
      checkPeriod: 2 * 60 * 1000, // 2 minutes
      dbRecordIdIsSessionId: true,
      dbRecordIdFunction: undefined,
      sessionModel: 'Session',
      expiresField: 'expires',
    }),
    secret: config.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    },
  })
);

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
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
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