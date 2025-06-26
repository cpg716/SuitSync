const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');

// GET /api/stats/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    // Placeholder data - we will implement the real logic later
    const totalParties = await prisma.party.count();
    const upcomingAppointments = await prisma.appointment.count({ where: { dateTime: { gte: new Date() } } });
    const pendingAlterations = await prisma.alterationJob.count({ where: { status: 'NOT_STARTED' } });
    
    // Find top commission - this is a bit more complex
    // For now, let's just send some dummy data.
    const topCommission = 500; 

    res.json({
      totalParties,
      upcomingAppointments,
      pendingAlterations,
      topCommission,
    });
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

module.exports = router; 