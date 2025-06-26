const express = require('express');
const prisma = require('../prismaClient');
const router = express.Router();
const { authMiddleware, requireAdmin } = require('../middleware/auth');

router.use(authMiddleware, requireAdmin);

// GET /api/auditlog
router.get('/', async (req, res) => {
  const logs = await prisma.auditLog.findMany({
    include: { user: { select: { id: true, email: true, name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100
  });
  res.json(logs);
});

// GET /api/auditlog/:id
router.get('/:id', async (req, res) => {
  const log = await prisma.auditLog.findUnique({
    where: { id: Number(req.params.id) },
    include: { user: { select: { id: true, email: true, name: true } } }
  });
  if (!log) return res.status(404).json({ error: 'Not found' });
  res.json(log);
});

module.exports = router; 