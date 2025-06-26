const express = require('express');
const router = express.Router();
const appointmentsController = require('../controllers/appointmentsController');
const { verifyJWT } = require('../controllers/authController');

router.use(verifyJWT);

router.get('/', appointmentsController.listAppointments);
router.post('/', appointmentsController.createAppointment);

module.exports = router;