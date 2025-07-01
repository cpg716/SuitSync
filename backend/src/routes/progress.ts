import { Router } from 'express';
import {
  getCustomerProgress,
  getPartyMemberProgress,
  getPartyProgressSummary,
  getProgressDashboard,
  getOverdueAppointments,
  getAppointmentsNeedingFollowUp
} from '../controllers/progressController';

const router = Router();

// Customer progress
router.get('/customers/:customerId', getCustomerProgress);

// Party member progress
router.get('/party-members/:partyMemberId', getPartyMemberProgress);

// Party progress summary
router.get('/parties/:partyId', getPartyProgressSummary);

// Dashboard and overview
router.get('/dashboard', getProgressDashboard);
router.get('/overdue', getOverdueAppointments);
router.get('/follow-up-needed', getAppointmentsNeedingFollowUp);

export default router;
