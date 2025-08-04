import express from 'express';
import {
  getSuits,
  getSuitById,
  createSuit,
  updateSuit,
  deleteSuit,
  getSuitOptions
} from '../controllers/suitsController';
import { authMiddleware, requirePermission } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

// Get all wedding suits
router.get('/', authMiddleware, asyncHandler(getSuits));

// Get suit options for dropdowns (grouped by vendor/style/color)
router.get('/options', authMiddleware, asyncHandler(getSuitOptions));

// Get specific wedding suit by ID
router.get('/:id', authMiddleware, asyncHandler(getSuitById));

// Create new wedding suit
router.post('/', authMiddleware, requirePermission('suits', 'write'), asyncHandler(createSuit));

// Update wedding suit
router.put('/:id', authMiddleware, requirePermission('suits', 'write'), asyncHandler(updateSuit));

// Delete wedding suit
router.delete('/:id', authMiddleware, requirePermission('suits', 'write'), asyncHandler(deleteSuit));

export default router; 