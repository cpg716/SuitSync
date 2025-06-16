// server/index.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');           // ← import cors
const session = require('express-session');
const alterationsRouter = require('./routes/alterations');
const webhooksRouter = require('./webhooks');
const partiesRouter = require('./routes/parties');
const appointmentsRouter = require('./routes/appointments');
const usersRouter = require('./routes/users');
const customersRouter = require('./routes/customers');
const authRouter = require('./auth');
const syncRouter = require('./routes/sync');
const adminRouter = require('./routes/admin');
const SQLiteStore = require('connect-sqlite3')(session);
// ... other imports ...

const app = express();

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
    secure: false,        // false for localhost
    sameSite: 'lax',      // 'lax' for localhost, 'none' only with HTTPS
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
// Direct route for /api/commissions/leaderboard
app.use('/api/commissions/leaderboard', (req, res, next) => {
  // Forward to the leaderboard handler in usersRouter
  req.url = '/commissions/leaderboard';
  usersRouter(req, res, next);
});

// ── START SERVER ───────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});