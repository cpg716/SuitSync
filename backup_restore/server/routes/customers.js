const express = require('express');
const router = express.Router();
const customersController = require('../controllers/customersController');
const { verifyJWT } = require('../controllers/authController');

router.use(verifyJWT);

router.get('/', customersController.listCustomers);
router.get('/:id', customersController.getCustomer);

module.exports = router; 