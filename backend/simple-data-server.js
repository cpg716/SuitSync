#!/usr/bin/env node

/**
 * Simple Data Server
 * 
 * This bypasses all TypeScript issues and serves data directly.
 * Since this is a personal business app, we can use this approach.
 */

const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();

// CORS
app.use(cors({
  origin: 'http://localhost:3001',
  credentials: false
}));

// Simple data endpoints
app.get('/api/parties', async (req, res) => {
  try {
    const parties = await prisma.party.findMany({
      include: {
        members: {
          include: {
            customer: true
          }
        },
        appointments: {
          include: {
            individualCustomer: true,
            tailor: true
          }
        },
        alterationJobs: {
          include: {
            tailor: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    res.json(parties);
  } catch (error) {
    console.error('Error fetching parties:', error);
    res.status(500).json({ error: 'Failed to fetch parties' });
  }
});

app.get('/api/customers', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        skip: offset,
        take: limit,
        orderBy: {
          name: 'asc'
        }
      }),
      prisma.customer.count()
    ]);
    
    res.json({
      customers,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        current: page,
        limit
      }
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

app.get('/api/alterations', async (req, res) => {
  try {
    const alterationJobs = await prisma.alterationJob.findMany({
      include: {
        party: {
          include: {
            members: {
              include: {
                customer: true
              }
            }
          }
        },
        tailor: true,
        partyMember: {
          include: {
            customer: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    res.json(alterationJobs);
  } catch (error) {
    console.error('Error fetching alterations:', error);
    res.status(500).json({ error: 'Failed to fetch alterations' });
  }
});

app.get('/api/appointments', async (req, res) => {
  try {
    const appointments = await prisma.appointment.findMany({
      include: {
        party: {
          include: {
            members: {
              include: {
                customer: true
              }
            }
          }
        },
        individualCustomer: true,
        member: {
          include: {
            customer: true,
            party: true
          }
        },
        tailor: true
      },
      orderBy: {
        dateTime: 'asc'
      }
    });
    res.json(appointments);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

app.get('/api/stats/dashboard', async (req, res) => {
  try {
    const [customerCount, partyCount, appointmentCount, alterationCount] = await Promise.all([
      prisma.customer.count(),
      prisma.party.count(),
      prisma.appointment.count(),
      prisma.alterationJob.count()
    ]);
    
    res.json({
      customers: customerCount,
      parties: partyCount,
      appointments: appointmentCount,
      alterations: alterationCount
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

app.get('/api/suits', async (req, res) => {
  try {
    const suits = await prisma.weddingSuit.findMany({
      where: {
        isActive: true
      },
      orderBy: [
        { vendor: 'asc' },
        { style: 'asc' },
        { color: 'asc' }
      ]
    });
    res.json(suits);
  } catch (error) {
    console.error('Error fetching suits:', error);
    res.status(500).json({ error: 'Failed to fetch suits' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', server: 'simple-data-server' });
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`🚀 Simple Data Server running on port ${PORT}`);
  console.log(`📊 Available endpoints:`);
  console.log(`   GET /api/parties`);
  console.log(`   GET /api/customers`);
  console.log(`   GET /api/alterations`);
  console.log(`   GET /api/appointments`);
  console.log(`   GET /api/stats/dashboard`);
  console.log(`   GET /api/suits`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down simple data server...');
  await prisma.$disconnect();
  process.exit(0);
}); 