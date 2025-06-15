const express = require('express');
const router = express.Router();
router.post('/lightspeed', (req, res) => {
  const eventType = req.headers['x-lightspeed-event'] || req.body.eventType;
  console.log('Received Lightspeed webhook:', eventType, req.body);
  // TODO: Add logic to sync customers, sales, line items, events
  res.sendStatus(200);
});
router.get('/sync-status', (req, res) => {
  // TODO: Replace with real sync status logic
  res.json({ status: 'ok', lastSync: new Date().toISOString() });
});
module.exports = router;
