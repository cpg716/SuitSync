const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const requireAuth = require('../middleware/auth');

// GET /api/commissions/leaderboard
router.get('/leaderboard', requireAuth, async (req, res) => {
  try {
    const associates = await prisma.user.findMany({
      where: {
        OR: [
          { role: 'associate' },
          { role: 'sales' },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        saleAssignments: true,
      },
    });
    const leaderboard = associates.map(a => {
      const totalSales = a.saleAssignments.reduce((sum, sa) => sum + (sa.amount || 0), 0);
      const totalCommission = a.saleAssignments.reduce((sum, sa) => sum + ((sa.amount || 0) * (sa.commissionRate || 0)), 0);
      return {
        associate: {
          id: a.id,
          name: a.name,
          email: a.email,
          role: a.role,
        },
        totalSales,
        totalCommission,
      };
    });
    leaderboard.sort((a, b) => b.totalSales - a.totalSales);
    res.json(leaderboard);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load sales leaderboard' });
  }
});

// GET /api/commissions/all?month=YYYY-MM (admin only)
router.get('/all', requireAuth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const { month } = req.query;
  const [year, m] = month.split('-');
  const start = new Date(Number(year), Number(m) - 1, 1);
  const end = new Date(Number(year), Number(m), 1);
  try {
    const assignments = await prisma.saleAssignment.findMany({
      where: {
        createdAt: { gte: start, lt: end },
      },
      include: { associate: true },
    });
    // TODO: Sync missing sales from Lightspeed if needed
    const grouped = {};
    for (const a of assignments) {
      if (!grouped[a.associateId]) grouped[a.associateId] = { associate: a.associate, commission: 0, salesTotal: 0 };
      grouped[a.associateId].commission += a.amount * a.commissionRate;
      grouped[a.associateId].salesTotal += a.amount;
    }
    res.json(Object.values(grouped));
  } catch (err) {
    res.status(500).json({ error: 'Failed to load commissions' });
  }
});

// GET /api/commissions/mine?month=YYYY-MM (staff)
router.get('/mine', requireAuth, async (req, res) => {
  const { month } = req.query;
  const [year, m] = month.split('-');
  const start = new Date(Number(year), Number(m) - 1, 1);
  const end = new Date(Number(year), Number(m), 1);
  try {
    const assignments = await prisma.saleAssignment.findMany({
      where: {
        associateId: req.user.id,
        createdAt: { gte: start, lt: end },
      },
    });
    // TODO: Sync missing sales from Lightspeed if needed
    res.json(assignments.map(a => ({ saleId: a.saleId, amount: a.amount, commission: a.amount * a.commissionRate })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to load your commissions' });
  }
});

module.exports = router; 