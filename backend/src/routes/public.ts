import express from 'express';
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();
const prisma = new PrismaClient().$extends(withAccelerate());

// Public endpoints - no authentication required
// Since this is a personal business app, we can make data publicly accessible

// GET /api/public/parties
router.get('/parties', asyncHandler(async (req: express.Request, res: express.Response) => {
  const parties = await prisma.party.findMany({
    include: {
      members: true,
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
}));

// GET /api/public/customers
router.get('/customers', asyncHandler(async (req: express.Request, res: express.Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
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
}));

// GET /api/public/alterations
router.get('/alterations', asyncHandler(async (req: express.Request, res: express.Response) => {
  const alterationJobs = await prisma.alterationJob.findMany({
    include: {
      party: {
        include: {
          members: true
        }
      },
      tailor: true,
      partyMember: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
  
  res.json(alterationJobs);
}));

// GET /api/public/appointments
router.get('/appointments', asyncHandler(async (req: express.Request, res: express.Response) => {
  const appointments = await prisma.appointment.findMany({
    include: {
      party: {
        include: {
          members: true
        }
      },
      individualCustomer: true,
      member: {
        include: {
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
}));

// GET /api/public/suits
router.get('/suits', asyncHandler(async (req: express.Request, res: express.Response) => {
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
}));

// GET /api/public/suits/options
router.get('/suits/options', asyncHandler(async (req: express.Request, res: express.Response) => {
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
}));

// GET /api/public/stats
router.get('/stats', asyncHandler(async (req: express.Request, res: express.Response) => {
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
}));

export default router; 