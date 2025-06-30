import express from 'express';
import { getProducts } from '../controllers/productsController';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

router.get('/', authMiddleware, asyncHandler(getProducts));

export default router; 