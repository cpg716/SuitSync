import express from 'express';
import { TailorSelectionController } from '../controllers/tailorSelectionController';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

// Get available tailors for selection
router.get('/available', asyncHandler(TailorSelectionController.getAvailableTailors));

// Save tailor selection for a session
router.post('/save', asyncHandler(TailorSelectionController.saveTailorSelection));

// Get the last selected tailor for a session
router.get('/last/:sessionId', asyncHandler(TailorSelectionController.getLastSelectedTailor));

// Clear tailor selection for a session
router.delete('/clear/:sessionId', asyncHandler(TailorSelectionController.clearTailorSelection));

// Get all active tailor selection sessions (admin only)
router.get('/sessions', asyncHandler(TailorSelectionController.getActiveTailorSessions));

export default router; 