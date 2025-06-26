const express = require('express');
const router = express.Router();
const customersController = require('../controllers/customersController');
const { authMiddleware } = require('../middleware/auth');

// Apply auth middleware to all customer routes
router.use(authMiddleware);

// List customers from Lightspeed
router.get('/lightspeed', customersController.listLightspeedCustomers);

// List customers with search and pagination
router.get('/', customersController.listCustomers);

// Get single customer
router.get('/:id', customersController.getCustomer);

// Create new customer
router.post('/', customersController.createCustomer);

// Update customer
router.put('/:id', customersController.updateCustomer);

// Get customer measurements
router.get('/:id/measurements', customersController.getCustomerMeasurements);

// Update customer measurements
router.put('/:id/measurements', customersController.updateCustomerMeasurements);

module.exports = router; 