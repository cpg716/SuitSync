const express = require('express');
const router = express.Router();
const { getProducts } = require('../controllers/productsController');
const { authMiddleware } = require('../middleware/auth');

router.get('/', authMiddleware, getProducts);

module.exports = router; 