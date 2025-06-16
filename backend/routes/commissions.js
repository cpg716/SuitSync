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
    const leaderboard = associates.map(a => ({
      associate: {
        id: a.id,
        name: a.name,
        email: a.email,
        role: a.role,
      },
      totalCommission: a.saleAssignments.reduce((sum, sa) => sum + (sa.amount || 0), 0),
    }));
    leaderboard.sort((a, b) => b.totalCommission - a.totalCommission);
    res.json(leaderboard);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load commission leaderboard' });
  }
});

module.exports = router; 