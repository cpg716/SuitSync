// server/index.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
console.log("Starting server... [EDITED AT " + new Date().toISOString() + "]");
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);

// Monkey-patch BigInt to allow JSON serialization
BigInt.prototype.toJSON = function() { return this.toString(); };

const app = express();

const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../frontend/out')));

app.use(
  session({
    store: new SQLiteStore({
      dir: path.join(__dirname, '..'),
      db: 'sessions.sqlite',
      concurrentDB: true,
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    },
  })
);

// Services must be initialized BEFORE routes are registered
const { initScheduledSync, syncUserPhotos } = require('./services/syncService');
const workflowService = require('./services/workflowService');
const { getLightspeedHealth } = require('./controllers/lightspeedController');
const logger = require('./utils/logger');

// Initialize services
initScheduledSync();
workflowService.initialize();

// Initialize user photo sync (run daily)
const userPhotoSyncInterval = 24 * 60 * 60 * 1000; // 24 hours
setInterval(() => {
  syncUserPhotos().catch(err => {
    console.error('Scheduled user photo sync failed:', err);
  });
}, userPhotoSyncInterval);

// Run initial user photo sync after 5 minutes of server startup
setTimeout(() => {
  syncUserPhotos().catch(err => {
    console.error('Initial user photo sync failed:', err);
  });
}, 5 * 60 * 1000);

// Initialize periodic Lightspeed health checks (every 15 minutes)
const healthCheckInterval = 15 * 60 * 1000; // 15 minutes
const performHealthCheck = async () => {
  try {
    // Create a mock request/response for the health check
    const mockReq = {};
    const mockRes = {
      status: () => mockRes,
      json: (data) => {
        logger.info('[Health Monitor] Lightspeed health check results:', {
          connection: data.lightspeedConnection,
          syncStatuses: data.syncStatuses?.length || 0,
          hasErrors: data.lightspeedApiError || data.databaseError
        });
      }
    };
    
    await getLightspeedHealth(mockReq, mockRes);
  } catch (error) {
    logger.error('[Health Monitor] Failed to perform Lightspeed health check:', error);
  }
};

// Run health check on startup (after 2 minutes) and then periodically
setTimeout(() => {
  performHealthCheck();
  setInterval(performHealthCheck, healthCheckInterval);
}, 2 * 60 * 1000);

// Routers
const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customers');
const partiesRoutes = require('./routes/parties');
const appointmentsRoutes = require('./routes/appointments');
const alterationsRoutes = require('./routes/alterations');
const commissionsRouter = require('./routes/commissions');
const auditLogRoutes = require('./routes/auditlog');
const adminRoutes = require('./routes/admin');
const syncRoutes = require('./routes/sync');
const productsRoutes = require('./routes/products');
const statsRoutes = require('./routes/stats');
const salesRoutes = require('./routes/sales');
const lightspeedRoutes = require('./routes/lightspeed');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/parties', partiesRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/alterations', alterationsRoutes);
app.use('/api/commissions', commissionsRouter);
app.use('/api/auditlog', auditLogRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/lightspeed', lightspeedRoutes);
app.use('/api/users', require('./routes/users'));

app.get('/api/health', (req, res) => {
    // Basic health check
    res.status(200).json({ status: 'ok' });
});

app.use('/uploads', express.static(path.join(__dirname, '..', 'public', 'uploads')));

const PORT = process.env.PORT || 3000;
let server;

server = app.listen(PORT, () => {
  logger.info(`Server listening on port ${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    logger.error(`Port ${PORT} is already in use.`);
  } else {
    logger.error('Server error:', err);
  }
});

const shutdown = (signal) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  if (server) {
    server.close((err) => {
      if (err) {
        logger.error('Error during server shutdown:', err);
        process.exit(1);
      }
      logger.info('Server closed.');
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);

  } else {
     process.exit(0);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = app;