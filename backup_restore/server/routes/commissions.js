const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const { verifyJWT } = require('../controllers/authController');

// GET /api/commissions/leaderboard (Sales-based)
router.get('/leaderboard', verifyJWT, async (req, res) => {
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

module.exports = router; 