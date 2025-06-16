const express = require('express');
const router = express.Router();
const prisma = require('./prismaClient');

router.post('/lightspeed', async (req, res) => {
  const eventType = req.headers['x-lightspeed-event'] || req.body.eventType;
  console.log('Received Lightspeed webhook:', eventType, req.body);
  try {
    if (eventType === 'sale.updated' && req.body.saleId && req.body.customFields?.next_fitting_date) {
      // Find appointment by saleId and update
      const appt = await prisma.appointment.findFirst({ where: { saleId: req.body.saleId } });
      if (appt) {
        await prisma.appointment.update({
          where: { id: appt.id },
          data: { dateTime: new Date(req.body.customFields.next_fitting_date), syncedToLightspeed: true }
        });
        await prisma.syncLog.create({
          data: { appointmentId: appt.id, direction: 'inbound', status: 'success', message: 'Updated from Lightspeed webhook', payload: req.body }
        });
      }
    }
    // Add more event types as needed
    res.sendStatus(200);
  } catch (err) {
    if (req.body.saleId) {
      const appt = await prisma.appointment.findFirst({ where: { saleId: req.body.saleId } });
      if (appt) {
        await prisma.syncLog.create({
          data: { appointmentId: appt.id, direction: 'inbound', status: 'failed', message: err.message, payload: req.body }
        });
      }
    }
    res.sendStatus(500);
  }
});

router.get('/sync-status', (req, res) => {
  // TODO: Replace with real sync status logic
  res.json({ status: 'ok', lastSync: new Date().toISOString() });
});

module.exports = router;
