import express from 'express';
import * as customersController from '../controllers/customersController';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

// List customers from Lightspeed
router.get('/lightspeed', asyncHandler(customersController.listLightspeedCustomers));

// List customers with search and pagination
router.get('/', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
}, asyncHandler(customersController.listCustomers));

// Get single customer
router.get('/:id', asyncHandler(customersController.getCustomer));

// Create new customer
router.post('/', asyncHandler(customersController.createCustomer));

// Update customer
router.put('/:id', asyncHandler(customersController.updateCustomer));

// Get customer measurements
router.get('/:id/measurements', asyncHandler(customersController.getCustomerMeasurements));

// Update customer measurements
router.put('/:id/measurements', asyncHandler(customersController.updateCustomerMeasurements));

export default router; 