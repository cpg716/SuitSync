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
  credentials: true
}));

// Public data endpoints
app.get('/api/public/stats', async (req, res) => {
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

app.get('/api/public/parties', async (req, res) => {
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

app.get('/api/public/customers', async (req, res) => {
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

app.get('/api/public/alterations', async (req, res) => {
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

app.get('/api/public/appointments', async (req, res) => {
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

app.get('/api/public/suits', async (req, res) => {
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

app.get('/api/public/suits/options', async (req, res) => {
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
    
    // Group by vendor, style, color
    const options = suits.reduce((acc, suit) => {
      const key = `${suit.vendor}-${suit.style}-${suit.color}`;
      if (!acc[key]) {
        acc[key] = {
          vendor: suit.vendor,
          style: suit.style,
          color: suit.color,
          sizes: [],
          price: suit.price
        };
      }
      acc[key].sizes.push(suit.size);
      return acc;
    }, {});
    
    res.json(Object.values(options));
  } catch (error) {
    console.error('Error fetching suit options:', error);
    res.status(500).json({ error: 'Failed to fetch suit options' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', server: 'simple-data-server' });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`🚀 Simple Data Server running on port ${PORT}`);
  console.log(`📊 Available endpoints:`);
  console.log(`   GET /api/public/stats`);
  console.log(`   GET /api/public/parties`);
  console.log(`   GET /api/public/customers`);
  console.log(`   GET /api/public/alterations`);
  console.log(`   GET /api/public/appointments`);
  console.log(`   GET /api/public/suits`);
  console.log(`   GET /api/public/suits/options`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down simple data server...');
  await prisma.$disconnect();
  process.exit(0);
}); 