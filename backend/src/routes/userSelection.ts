import express from 'express';
import { UserSelectionController } from '../controllers/userSelectionController';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

// Get all active users for selection
router.get('/active-users', asyncHandler(UserSelectionController.getActiveUsers));

// Select a user for the current session
router.post('/select-user', asyncHandler(UserSelectionController.selectUser));

// Get currently selected user
router.get('/selected-user', asyncHandler(UserSelectionController.getSelectedUser));

// Clear selected user
router.post('/clear-selection', asyncHandler(UserSelectionController.clearSelectedUser));

// Deactivate a user session (logout)
router.delete('/deactivate/:lightspeedUserId', asyncHandler(UserSelectionController.deactivateUser));

export default router; 