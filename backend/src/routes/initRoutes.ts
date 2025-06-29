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
} 