const express = require('express');
const prisma = require('../prismaClient');
const router = express.Router();

// GET /api/sync/errors
router.get('/errors', async (req, res) => {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const errors = await prisma.syncLog.findMany({
    where: { status: 'failed', createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
    select: { id: true, message: true, createdAt: true },
    take: 20,
  });
  res.json(errors);
});

module.exports = router; 