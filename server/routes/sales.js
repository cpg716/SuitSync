const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');

// GET /api/sales/recent
router.get('/recent', async (req, res) => {
  try {
    // Placeholder data - we will implement the real logic later
    const recentSales = await prisma.sale.findMany({
      take: 5,
      orderBy: {
        saleDate: 'desc',
      },
      include: {
        customer: true,
      }
    });
    res.json(recentSales);
  } catch (error) {
    console.error('Failed to fetch recent sales:', error);
    res.status(500).json({ error: 'Failed to fetch recent sales' });
  }
});

module.exports = router; 