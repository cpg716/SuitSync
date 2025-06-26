// server/index.js

require('dotenv/config');
const express = require('express');
const cors = require('cors');           // ← import cors
const session = require('express-session');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const Sentry = require('@sentry/node');
const alterationsRouter = require('./routes/alterations');
const webhooksRouter = require('./webhooks');
const partiesRouter = require('./routes/parties');
const appointmentsRouter = require('./routes/appointments');
const usersRouter = require('./routes/users');
const customersRouter = require('./routes/customers');
const authRouter = require('./routes/auth');
const syncRouter = require('./routes/sync');
const adminRouter = require('./routes/admin');
const SQLiteStore = require('connect-sqlite3')(session);
const cookieParser = require('cookie-parser');
const commissionsRouter = require('./routes/commissions');
// ... other imports ...

const app = express();

if (Sentry && Sentry.init && Sentry.Handlers) {
  Sentry.init({ dsn: process.env.SENTRY_DSN || '', environment: process.env.NODE_ENV || 'development' });
  app.use(Sentry.Handlers.requestHandler());
}
app.use(morgan('combined'));
app.use(helmet());

// Add cookie parser before session and body parsing
app.use(cookieParser());

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Speed limiting configuration
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // allow 50 requests per 15 minutes, then...
  delayMs: (hits) => hits * 100, // begin adding 100ms of delay per hit
});

// Apply rate limiting to all routes
app.use(limiter);
app.use(speedLimiter);

// ── CORS ────────────────────────────────────────────────────────────────────────
// Allow only your frontend origin and include credentials
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
}));

// ── SESSIONS ────────────────────────────────────────────────────────────────────
app.use(session({
  store: new SQLiteStore({ db: 'sessions.sqlite', dir: './' }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,        // false for localhost dev (use true for HTTPS in prod)
    sameSite: 'lax',      // lax for localhost dev (none for HTTPS in prod)
    maxAge: 1000 * 60 * 60 * 24, // 1 day
  },
}));

// ── BODY PARSING ────────────────────────────────────────────────────────────────
app.use(express.json());

// ── YOUR ROUTES ────────────────────────────────────────────────────────────────
// e.g. app.use('/api/parties', require('./routes/parties'));
//      app.use('/api/appointments', require('./routes/appointments'));

// Friendly root route
app.get('/', (req, res) => {
  res.send('SuitSync API server is running. Visit <a href="http://localhost:3001/">http://localhost:3001/</a> for the SuitSync app.');
});

app.use('/api/alterations', alterationsRouter);
app.use('/api/print', alterationsRouter); // for /print/tag and /print/batch
app.use('/api/webhooks', webhooksRouter);
app.use('/api/parties', partiesRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/users', usersRouter);
app.use('/api/customers', customersRouter);
app.use('/api/auth', authRouter);
app.use('/api/sync', syncRouter);
app.use('/api/admin', adminRouter);
app.use('/api/commissions', commissionsRouter);

app.get('/api/health', async (req, res) => {
  try {
    // Check DB connectivity
    let dbStatus = 'ok';
    try {
      await require('./prismaClient').$queryRaw`SELECT 1`;
    } catch (e) {
      dbStatus = 'error';
    }
    // Check session
    let sessionStatus = req.cookies.token ? 'present' : 'absent';
    res.json({ status: 'ok', db: dbStatus, session: sessionStatus });
  } catch (e) {
    res.status(500).json({ status: 'error', error: e.message });
  }
});

// Error handling
if (Sentry && Sentry.Handlers && Sentry.Handlers.errorHandler) {
  app.use(Sentry.Handlers.errorHandler());
}
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── START SERVER ───────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});