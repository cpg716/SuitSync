import { Express } from 'express';
import authRoutes from './auth';
import customersRoutes from './customers';
import partiesRoutes from './parties';
import appointmentsRoutes from './appointments';
import alterationsRoutes from './alterations';
import productsRoutes from './products';
import syncRoutes from './sync';
import adminRoutes from './admin';
import auditlogRoutes from './auditlog';
import commissionsRoutes from './commissions';
import usersRoutes from './users';
import printRoutes from './print';
import statsRoutes from './stats';
import notificationsRoutes from './notifications';
import lightspeedRoutes from './lightspeed';
import webhooksRoutes from './webhooks';
import performanceRoutes from './performance';
import monitoringRoutes from './monitoring';

// Register all API routes on the app
export function initRoutes(app: Express) {
  app.use('/api/auth', authRoutes);
  app.use('/api/customers', customersRoutes);
  app.use('/api/parties', partiesRoutes);
  app.use('/api/appointments', appointmentsRoutes);
  app.use('/api/alterations', alterationsRoutes);
  app.use('/api/products', productsRoutes);
  app.use('/api/sync', syncRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/auditlog', auditlogRoutes);
  app.use('/api/commissions', commissionsRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/print', printRoutes);
  app.use('/api/stats', statsRoutes);
  app.use('/api/notifications', notificationsRoutes);
  app.use('/api/lightspeed', lightspeedRoutes);
  app.use('/api/webhooks', webhooksRoutes);
  app.use('/api/performance', performanceRoutes);
  app.use('/api/monitoring', monitoringRoutes);
} 