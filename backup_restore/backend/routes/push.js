const express = require('express');
const router = express.Router();
const { getVapidPublicKey, saveSubscription, getAllSubscriptions, sendNotification } = require('../src/services/PushService');

// Get VAPID public key
router.get('/vapidPublicKey', (req, res) => {
  res.type('text/plain').send(getVapidPublicKey());
});

// Subscribe endpoint
router.post('/subscribe', async (req, res) => {
  try {
    const sub = req.body;
    if (!sub || !sub.endpoint || !sub.keys) return res.status(400).json({ error: 'Invalid subscription' });
    await saveSubscription(sub);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send test notification (admin only, for demo)
router.post('/send', async (req, res) => {
  try {
    const { title, body, url } = req.body;
    const payload = { title, body, url };
    const subs = await getAllSubscriptions();
    const results = await Promise.allSettled(subs.map(sub => sendNotification(sub, payload)));
    res.json({ sent: results.filter(r => r.status === 'fulfilled').length, failed: results.filter(r => r.status === 'rejected').length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 