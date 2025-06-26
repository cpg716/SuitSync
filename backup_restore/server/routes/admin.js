const express = require('express');
const prisma = require('../prismaClient');
const router = express.Router();

// GET /api/admin/settings
router.get('/settings', async (req, res) => {
  let settings = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!settings) {
    settings = await prisma.settings.create({
      data: {
        id: 1,
        reminderIntervals: '24,4',
        emailSubject: 'Reminder: Your appointment at {shopName}',
        emailBody: 'Hi {customerName},\nThis is a reminder for your appointment with {partyName} on {dateTime}.',
        smsBody: 'Reminder: {partyName} appointment on {dateTime} at {shopName}.',
      },
    });
  }
  res.json(settings);
});

// POST /api/admin/settings
router.post('/settings', async (req, res) => {
  const { reminderIntervals, emailSubject, emailBody, smsBody } = req.body;
  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: { reminderIntervals, emailSubject, emailBody, smsBody },
    create: { id: 1, reminderIntervals, emailSubject, emailBody, smsBody },
  });
  res.json(settings);
});

module.exports = router; 