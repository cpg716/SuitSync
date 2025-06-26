const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');
const lightspeedAuthController = require('../controllers/lightspeedAuthController');

// Local auth
router.post('/login', authController.login);
router.get('/session', authMiddleware, authController.getSession);
router.post('/logout', authController.logout);

// Lightspeed OAuth
router.get('/start-lightspeed', lightspeedAuthController.redirectToLightspeed);
router.get('/callback', lightspeedAuthController.handleCallback);

module.exports = router; 