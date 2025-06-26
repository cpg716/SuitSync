const express = require('express');
const router = express.Router();
const { getLightspeedHealth, deleteLightspeedUserSessions } = require('../controllers/lightspeedController');
const { authMiddleware, requireAdmin } = require('../middleware/auth');

// This endpoint provides a holistic health check of the Lightspeed integration.
// It should be accessible to admins to diagnose issues.
router.get('/health', authMiddleware, requireAdmin, getLightspeedHealth);

router.delete('/users/:userId/sessions', authMiddleware, requireAdmin, deleteLightspeedUserSessions);

module.exports = router; 