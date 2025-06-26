const express = require('express');
const router = express.Router();
const appointmentsController = require('../controllers/appointmentsController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', appointmentsController.listAppointments);
router.post('/', appointmentsController.createAppointment);
router.put('/:id', appointmentsController.updateAppointment);
router.delete('/:id', appointmentsController.deleteAppointment);

module.exports = router;