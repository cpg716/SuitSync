const express = require('express');
const prisma = require('../prismaClient');
const router = express.Router();
const { authMiddleware, requireAdmin } = require('../middleware/auth');

// All routes in this file should be protected and require admin privileges
router.use(authMiddleware, requireAdmin);

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

// Staff Management
router.get('/settings/staff', async (req, res) => {
  const staff = await prisma.user.findMany({
    orderBy: { name: 'asc' },
  });
  res.json(staff);
});

router.post('/settings/staff/:id', async (req, res) => {
  const { id } = req.params;
  const { commissionRate, availability } = req.body;
  const user = await prisma.user.update({
    where: { id: parseInt(id, 10) },
    data: { commissionRate, availability },
  });
  res.json(user);
});

// Current User's Availability
router.get('/settings/my-availability', async (req, res) => {
    const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { availability: true },
    });
    res.json(user);
});

router.post('/settings/my-availability', async (req, res) => {
    const { availability } = req.body;
    const user = await prisma.user.update({
        where: { id: req.user.id },
        data: { availability },
    });
    res.json(user);
});

// Alteration Task Types
router.get('/settings/task-types', async (req, res) => {
  const taskTypes = await prisma.alterationTaskType.findMany({
    orderBy: { name: 'asc' },
  });
  res.json(taskTypes);
});

router.post('/settings/task-types/:id?', async (req, res) => {
  const { id } = req.params;
  const { name, defaultDuration } = req.body;
  const data = { name, defaultDuration };

  if (id) {
    const taskType = await prisma.alterationTaskType.update({
      where: { id: parseInt(id, 10) },
      data,
    });
    res.json(taskType);
  } else {
    const taskType = await prisma.alterationTaskType.create({ data });
    res.json(taskType);
  }
});

router.delete('/settings/task-types/:id', async (req, res) => {
  const { id } = req.params;
  await prisma.alterationTaskType.delete({ where: { id: parseInt(id, 10) } });
  res.status(204).send();
});


// Tailor Abilities
router.get('/settings/tailor-abilities', async (req, res) => {
  const abilities = await prisma.tailorAbility.findMany({
    include: {
      tailor: { select: { id: true, name: true } },
      taskType: { select: { id: true, name: true } },
    },
    orderBy: { tailor: { name: 'asc' } },
  });
  res.json(abilities);
});

router.post('/settings/tailor-abilities/:id?', async (req, res) => {
    const { id } = req.params;
    const { tailorId, taskTypeId, proficiency } = req.body;
    const data = {
        tailorId: parseInt(tailorId, 10),
        taskTypeId: parseInt(taskTypeId, 10),
        proficiency: parseInt(proficiency, 10),
    };

    if (id) {
        const ability = await prisma.tailorAbility.update({
            where: { id: parseInt(id, 10) },
            data,
        });
        res.json(ability);
    } else {
        const ability = await prisma.tailorAbility.create({ data });
        res.json(ability);
    }
});

router.delete('/settings/tailor-abilities/:id', async (req, res) => {
    const { id } = req.params;
    await prisma.tailorAbility.delete({ where: { id: parseInt(id, 10) } });
    res.status(204).send();
});

// Tailor Schedules
router.get('/settings/tailor-schedules', async (req, res) => {
  const schedules = await prisma.tailorSchedule.findMany({
    include: {
      tailor: { select: { id: true, name: true } },
    },
    orderBy: [{ tailor: { name: 'asc' } }, { dayOfWeek: 'asc' }],
  });
  res.json(schedules);
});

router.post('/settings/tailor-schedules/:id?', async (req, res) => {
    const { id } = req.params;
    const { tailorId, dayOfWeek, startTime, endTime } = req.body;
    const data = {
        tailorId: parseInt(tailorId, 10),
        dayOfWeek: parseInt(dayOfWeek, 10),
        startTime,
        endTime,
    };
    if (id) {
        const schedule = await prisma.tailorSchedule.update({
            where: { id: parseInt(id, 10) },
            data,
        });
        res.json(schedule);
    } else {
        const schedule = await prisma.tailorSchedule.create({ data });
        res.json(schedule);
    }
});

router.delete('/settings/tailor-schedules/:id', async (req, res) => {
    const { id } = req.params;
    await prisma.tailorSchedule.delete({ where: { id: parseInt(id, 10) }});
    res.status(204).send();
});

// Shop Skills / Tailor Abilities
router.get('/settings/skills', async (req, res) => {
  const abilities = await prisma.tailorAbility.findMany({
    include: {
      tailor: { select: { id: true, name: true } },
      taskType: { select: { id: true, name: true } },
    },
    orderBy: { tailor: { name: 'asc' } },
  });
  res.json(abilities);
});

module.exports = router; 