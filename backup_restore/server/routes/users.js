const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const { verifyJWT } = require('../controllers/authController');

router.use(verifyJWT);

router.get('/', usersController.listUsers);
router.get('/:id', usersController.getUser);

module.exports = router; 