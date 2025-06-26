const express = require('express');
const prisma = require('../prismaClient');
const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

router.use(requireAuth);

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