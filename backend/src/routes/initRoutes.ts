import { Express } from 'express';
import authRoutes from './auth';
import customersRoutes from './customers';
import partiesRoutes from './parties';
import appointmentsRoutes from './appointments';
import alterationsRoutes from './alterations';
import suitsRoutes from './suits';
import syncRoutes from './sync';
import adminRoutes from './admin';
import auditlogRoutes from './auditlog';
import commissionsRoutes from './commissions';
import usersRoutes from './users';
import printRoutes from './print';
import statsRoutes from './stats';
import notificationsRoutes from './notifications';
import lightspeedRoutes from './lightspeed';
import lightspeedSyncRoutes from './lightspeedSync';
import webhooksRoutes from './webhooks';
import performanceRoutes from './performance';
import monitoringRoutes from './monitoring';
import salesRoutes from './sales';
import userSwitchRoutes from './userSwitch';
import progressRoutes from './progress';
import checklistsRoutes from './checklists';
import tasksRoutes from './tasks';
import userSelectionRoutes from './userSelection';
import publicRoutes from './public';

// Register all API routes on the app
export function initRoutes(app: Express) {
  // Public routes (no authentication required)
  app.use('/api/public', publicRoutes);
  
  // Protected routes (authentication required)
  app.use('/api/auth', authRoutes);
  app.use('/api/customers', customersRoutes);
  app.use('/api/parties', partiesRoutes);
  app.use('/api/appointments', appointmentsRoutes);
  app.use('/api/alterations', alterationsRoutes);
  app.use('/api/suits', suitsRoutes);
  app.use('/api/sync', syncRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/auditlog', auditlogRoutes);
  app.use('/api/commissions', commissionsRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/print', printRoutes);
  app.use('/api/stats', statsRoutes);
  app.use('/api/notifications', notificationsRoutes);
  app.use('/api/lightspeed', lightspeedRoutes);
  app.use('/api/lightspeed-sync', lightspeedSyncRoutes);
  app.use('/api/webhooks', webhooksRoutes);
  app.use('/api/performance', performanceRoutes);
  app.use('/api/monitoring', monitoringRoutes);
  app.use('/api/sales', salesRoutes);
  app.use('/api/user-switch', userSwitchRoutes);
  app.use('/api/progress', progressRoutes);
  app.use('/api/checklists', checklistsRoutes);
  app.use('/api/tasks', tasksRoutes);
  app.use('/api/user-selection', userSelectionRoutes);
}

// TSOA expects RegisterRoutes export
export const RegisterRoutes = initRoutes;