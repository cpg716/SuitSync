import express from 'express';
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import { asyncHandler } from '../utils/asyncHandler';
import jwt from 'jsonwebtoken';
import { createLightspeedClient } from '../lightspeedClient';
import logger from '../utils/logger';

const router = express.Router();
const prisma = new PrismaClient().$extends(withAccelerate());

// GET /api/public/booking-config
router.get('/booking-config', asyncHandler(async (_req: express.Request, res: express.Response) => {
  const s = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!s) return res.json({});
  res.json({
    businessName: s.bookingBusinessName || '',
    businessSubtitle: s.bookingBusinessSubtitle || '',
    businessAddress: s.bookingBusinessAddress || '',
    businessPhone: s.bookingBusinessPhone || '',
    businessEmail: s.bookingBusinessEmail || '',
    logoUrl: s.bookingLogoUrl || '',
    primaryColor: s.bookingPrimaryColor || '#2563eb',
    welcomeMessage: s.bookingWelcomeMessage || 'Book your appointment',
    successMessage: s.bookingSuccessMessage || 'Thank you! Your appointment has been booked.',
  });
}));

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

// GET /api/public/staff?role=sales|tailor|admin|manager
router.get('/staff', asyncHandler(async (req: express.Request, res: express.Response) => {
  const role = String(req.query.role || 'sales').toLowerCase();
  const hasLsSession = !!req.session?.lsAccessToken;
  let localUsers: Array<{ id: number; name: string; role: string; photoUrl: string | null; email: string | null; lightspeedEmployeeId: string | null }>=[];
  
  async function ensureLocalForLsUser(lsUser: any) {
    try {
      const lsId = String(lsUser.id);
      const email = (lsUser.email || '').toLowerCase() || null;
      const name = lsUser.display_name || lsUser.name || `User ${lsId}`;
      const photo = lsUser.image_source || lsUser.photo_url || lsUser.avatar || null;
      const mappedRole = (lsUser.account_type || '').toLowerCase();
      // Map LS roles to our roles
      let roleMapped = 'sales';
      if (mappedRole === 'admin') roleMapped = 'admin';
      else if (mappedRole === 'manager') roleMapped = 'manager';
      else if (mappedRole === 'sales') roleMapped = 'sales';

      const existing = await prisma.user.findFirst({ where: { lightspeedEmployeeId: lsId } });
      if (existing) {
        // Keep name/photo fresh
        const updated = await prisma.user.update({
          where: { id: existing.id },
          data: { name, email: email || existing.email, role: existing.role || roleMapped, photoUrl: photo || existing.photoUrl }
        });
        return updated;
      }
      const created = await prisma.user.create({
        data: { name, email, role: roleMapped, lightspeedEmployeeId: lsId, photoUrl: photo }
      });
      return created;
    } catch (err) {
      logger.warn('Failed to ensure local user for LS employee', err);
      return null;
    }
  }

  if (hasLsSession) {
    try {
      const client = createLightspeedClient(req);
      const all = await client.fetchAllWithPagination('/users');
      // Ensure all LS employees have a corresponding local record
      const ensured: any[] = [];
      for (const u of all) {
        const local = await ensureLocalForLsUser(u);
        if (local) ensured.push(local);
      }
      localUsers = ensured;
    } catch (e) {
      logger.error('Failed to fetch Lightspeed users for staff endpoint, falling back to local DB', e);
    }
  }

  if (!localUsers.length) {
    localUsers = await prisma.user.findMany({
      where: { email: { not: { contains: '@demo.com' } }, lightspeedEmployeeId: { not: null } },
      select: { id: true, name: true, role: true, photoUrl: true, email: true, lightspeedEmployeeId: true },
      orderBy: { name: 'asc' }
    });
  }

  // Apply role filter: sales includes admin and manager
  const filtered = localUsers.filter(u => {
    const r = (u.role || '').toLowerCase();
    if (role === 'sales') return ['sales','associate','manager','admin'].includes(r);
    if (role === 'manager') return r === 'manager';
    if (role === 'admin') return r === 'admin';
    if (role === 'tailor') return r === 'tailor';
    return true;
  });

  const out = filtered.map(u => ({ id: u.id, name: u.name, role: u.role, photoUrl: u.photoUrl || null, email: u.email }));
  res.json(out);
}));

// GET /api/public/availability?userId=1&date=YYYY-MM-DD&type=fitting&duration=60
router.get('/availability', asyncHandler(async (req: express.Request, res: express.Response) => {
  try {
    const userId = parseInt(String(req.query.userId || '0'));
    const date = String(req.query.date || '');
    const duration = Math.max(15, parseInt(String(req.query.duration || '60')));
    if (!userId || !date) return res.status(400).json({ error: 'userId and date are required' });

    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    const minNoticeMin = settings?.onlineBookingMinNoticeMinutes || 120;
    const maxPerDay = settings?.onlineBookingMaxPerDay || null;

    // Build working blocks for the day from UserSchedule (week override > recurring > exception > TailorSchedule > default)
    const dayStart = new Date(`${date}T00:00:00Z`);
    const nextDayStart = new Date(`${date}T00:00:00Z`);
    nextDayStart.setDate(nextDayStart.getDate() + 1);
    const weekDay = new Date(`${date}T00:00:00Z`).getUTCDay(); // 0=Sun .. 6=Sat
    // compute Monday of this week
    const diffToMonday = ((weekDay + 6) % 7); // days since Monday
    const monday = new Date(dayStart);
    monday.setUTCDate(dayStart.getUTCDate() - diffToMonday);

    let blocks: { start: string; end: string }[] = [];
    // Try week-specific schedule first
    const weekOverride = await prisma.userSchedule.findFirst({ where: { userId, weekStart: { gte: monday, lt: new Date(monday.getTime() + 7*24*60*60*1000) } } });
    if (weekOverride) {
      const days = (weekOverride.days as any[]) || [];
      const d = days[weekDay] || { isOff: false, blocks: [] };
      if (d.isOff) return res.json([]);
      blocks = Array.isArray(d.blocks) && d.blocks.length ? d.blocks : [];
    }
    // If none, try recurring schedule (weekStart null)
    if (blocks.length === 0) {
      const recurring = await prisma.userSchedule.findFirst({ where: { userId, weekStart: null } });
      if (recurring) {
        const days = (recurring.days as any[]) || [];
        const d = days[weekDay] || { isOff: false, blocks: [] };
        if (d.isOff) return res.json([]);
        blocks = Array.isArray(d.blocks) && d.blocks.length ? d.blocks : [];
      }
    }
    // Apply ScheduleException for the day (off or overriding blocks)
    const exception = await prisma.scheduleException.findFirst({ where: { userId, date: { gte: dayStart, lt: nextDayStart } } });
    if (exception) {
      if (exception.isOff) return res.json([]);
      if (exception.blocks) {
        const exBlocks = exception.blocks as any[];
        if (Array.isArray(exBlocks) && exBlocks.length) {
          blocks = exBlocks.map(b => ({ start: b.start, end: b.end }));
        }
      }
    }

    // If still empty, fallback to legacy TailorSchedule rows
    if (blocks.length === 0) {
      const legacy = await prisma.tailorSchedule.findMany({ where: { tailorId: userId, dayOfWeek: weekDay } });
      blocks = legacy.length ? legacy.map(l => ({ start: l.startTime, end: l.endTime })) : [];
    }
    // Apply global holiday closure
    const holiday = await prisma.globalHoliday.findFirst({ where: { date: { gte: dayStart, lt: nextDayStart }, isClosed: true } });
    if (holiday) return res.json([]);

    // Final default
    if (blocks.length === 0) {
      blocks = [{ start: '09:00', end: '17:00' }];
    }

    // Existing appts for the staff on that date
    const dayEnd = new Date(`${date}T23:59:59Z`);
    const appts = await prisma.appointment.findMany({
      where: {
        tailorId: userId,
        dateTime: { gte: dayStart, lte: dayEnd },
        status: { in: ['scheduled', 'rescheduled', 'confirmed'] as any },
      },
      select: { dateTime: true, durationMinutes: true },
    });

    // Buffer time between appointments (5 minutes) and travel buffer (from settings future extension)
    const bufferMin = 5;

    // Build slots
    const now = new Date();
    const earliest = new Date(now.getTime() + minNoticeMin * 60000);
    const slotSize = 15; // generate in 15-min increments, validate duration
    const taken: { start: Date; end: Date }[] = appts.map(a => {
      const start = new Date(a.dateTime as any);
      const end = new Date(start.getTime() + ((a.durationMinutes || 60) * 60000));
      return { start, end };
    });
    const slots: string[] = [];
    for (const b of blocks) {
      const bStart = new Date(`${date}T${b.start}:00`);
      const bEnd = new Date(`${date}T${b.end}:00`);
      for (let t = bStart.getTime(); t + duration * 60000 <= bEnd.getTime(); t += slotSize * 60000) {
        const start = new Date(t);
        const end = new Date(t + duration * 60000);
        if (start < earliest) continue;
        const overlaps = taken.some(x => {
          const xStart = new Date(x.start.getTime() - bufferMin * 60000);
          const xEnd = new Date(x.end.getTime() + bufferMin * 60000);
          return start < xEnd && end > xStart;
        });
        if (!overlaps) slots.push(start.toISOString());
        if (maxPerDay && slots.length >= maxPerDay) break;
      }
      if (maxPerDay && slots.length >= maxPerDay) break;
    }

    return res.json(slots);
  } catch (err: any) {
    console.error('availability error:', err?.stack || err);
    // Graceful fallback: return default 9-5 slots to avoid blocking UI
    try {
      const date = String(req.query.date || '');
      const duration = Math.max(15, parseInt(String(req.query.duration || '60')));
      const settings = await prisma.settings.findUnique({ where: { id: 1 } });
      const minNoticeMin = settings?.onlineBookingMinNoticeMinutes || 120;
      const now = new Date();
      const earliest = new Date(now.getTime() + minNoticeMin * 60000);
      const slotSize = 15;
      const bStart = new Date(`${date}T09:00:00`);
      const bEnd = new Date(`${date}T17:00:00`);
      const slots: string[] = [];
      for (let t = bStart.getTime(); t + duration * 60000 <= bEnd.getTime(); t += slotSize * 60000) {
        const start = new Date(t);
        const end = new Date(t + duration * 60000);
        if (start < earliest) continue;
        slots.push(start.toISOString());
      }
      return res.json(slots);
    } catch (fallbackErr) {
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}));

// POST /api/public/appointments/book  (customer booking via iframe)
router.post('/appointments/book', asyncHandler(async (req: express.Request, res: express.Response) => {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!settings?.onlineBookingEnabled) {
    return res.status(403).json({ error: 'Online booking disabled' });
  }
  // Enforce iframe/origin allowlist for booking submissions
  const origin = req.get('Origin') || '';
  const allowedCsv = settings.onlineBookingIframeAllowedOrigins || '';
  const allowedOrigins = allowedCsv.split(',').map((s: string) => s.trim()).filter(Boolean);
  if (allowedOrigins.length > 0 && origin && !allowedOrigins.includes(origin)) {
    return res.status(403).json({ error: 'Origin not allowed for booking' });
  }
  const { name, email, phone, dateTime, durationMinutes, type, notes } = req.body || {};
  if (!name || !email || !dateTime) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (settings.onlineBookingRequirePhone && !phone) {
    return res.status(400).json({ error: 'Phone is required' });
  }
  const allowedTypes = (settings.onlineBookingAllowedTypes || '').split(',').map(s => s.trim()).filter(Boolean);
  if (allowedTypes.length && type && !allowedTypes.includes(type)) {
    return res.status(400).json({ error: 'Appointment type not allowed' });
  }
  // Create or find a placeholder customer
  const customer = await prisma.customer.upsert({
    where: { lightspeedId: `web-${String(email).toLowerCase()}` },
    create: {
      name: name,
      email: String(email).toLowerCase(),
      first_name: name,
      last_name: '',
      lightspeedId: `web-${String(email).toLowerCase()}`,
    },
    update: {
      name,
      email: String(email).toLowerCase(),
      first_name: name,
    },
  });
  const appt = await prisma.appointment.create({
    data: {
      dateTime: new Date(dateTime),
      durationMinutes: durationMinutes || 60,
      type: (type as any) || 'fitting',
      notes: notes || '',
      individualCustomerId: customer.id,
      tailorId: Number(req.body.salesId) || undefined,
      status: 'scheduled',
    },
  });
  // Issue signed links for cancel/reschedule
  const secret = process.env.JWT_SECRET || 'change_me';
  const cancelToken = jwt.sign({ appointmentId: appt.id, action: 'cancel' }, secret, { expiresIn: '30d' });
  const rescheduleToken = jwt.sign({ appointmentId: appt.id, action: 'reschedule' }, secret, { expiresIn: '30d' });
  res.json({
    success: true,
    appointmentId: appt.id,
    cancelUrl: `/appointments/cancel?appointmentId=${appt.id}&token=${encodeURIComponent(cancelToken)}`,
    rescheduleUrl: `/appointments?reschedule=1&appointmentId=${appt.id}&token=${encodeURIComponent(rescheduleToken)}`,
  });
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

// GET /api/public/users
router.get('/users', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { name, email } = req.query;
  const hasLsSession = !!req.session?.lsAccessToken;

  async function upsertFromLightspeed(): Promise<any[]> {
    try {
      const client = createLightspeedClient(req);
      const lsUsers = await client.fetchAllWithPagination('/users');
      const locals: any[] = [];
      for (const u of lsUsers) {
        const lsId = String(u.id);
        const existing = await prisma.user.findFirst({ where: { lightspeedEmployeeId: lsId } });
        const nameMapped = u.display_name || u.name || `User ${lsId}`;
        const photoMapped = u.image_source || u.photo_url || u.avatar || null;
        const emailMapped = (u.email || '').toLowerCase() || null;
        const roleMapped = (u.account_type || '').toLowerCase() === 'admin' ? 'admin' : ((u.account_type || '').toLowerCase() === 'manager' ? 'manager' : 'sales');
        if (existing) {
          const updated = await prisma.user.update({
            where: { id: existing.id },
            data: { name: nameMapped, email: emailMapped || existing.email, role: existing.role || roleMapped, photoUrl: photoMapped || existing.photoUrl }
          });
          locals.push(updated);
        } else {
          const created = await prisma.user.create({ data: { name: nameMapped, email: emailMapped, role: roleMapped, lightspeedEmployeeId: lsId, photoUrl: photoMapped } });
          locals.push(created);
        }
      }
      return locals;
    } catch (e) {
      logger.error('Failed to sync users from Lightspeed in public/users', e);
      return [];
    }
  }

  if (hasLsSession) {
    const synced = await upsertFromLightspeed();
    if (synced.length) {
      const list = synced
        .filter(u => !!u.lightspeedEmployeeId)
        .map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, photoUrl: u.photoUrl || null }));
      // Optional name/email filtering
      const filtered = list.filter(u => {
        if (name && typeof name === 'string') {
          if (!u.name?.toLowerCase().includes(name.toLowerCase())) return false;
        }
        if (email && typeof email === 'string') {
          if (u.email?.toLowerCase() !== email.toLowerCase()) return false;
        }
        return true;
      });
      return res.json(filtered);
    }
  }

  // Fallback to local DB but only Lightspeed-backed users
  const whereClause: any = { email: { not: { contains: '@demo.com' } }, lightspeedEmployeeId: { not: null } };
  if (name && typeof name === 'string') whereClause.name = { contains: name, mode: 'insensitive' };
  if (email && typeof email === 'string') whereClause.email = { equals: String(email).toLowerCase() };

  const users = await prisma.user.findMany({
    where: whereClause,
    select: { id: true, name: true, email: true, photoUrl: true, role: true },
    orderBy: { name: 'asc' }
  });

  const usersWithPhoto = users.map(u => ({ ...u, photoUrl: u.photoUrl || null }));
  res.json(usersWithPhoto);
}));

// Proxy serving of user photos to ensure consistent access everywhere
router.get('/user-photo', asyncHandler(async (req: express.Request, res: express.Response) => {
  const id = parseInt(String(req.query.id || '0'));
  if (!id) return res.status(400).send('Missing id');
  const user = await prisma.user.findUnique({ where: { id }, select: { photoUrl: true, name: true } });
  if (!user || !user.photoUrl) return res.status(404).send('Not found');
  try {
    const response = await fetch(user.photoUrl as any);
    if (!response.ok) return res.status(404).send('Not found');
    res.setHeader('Content-Type', response.headers.get('Content-Type') || 'image/jpeg');
    const buffer = Buffer.from(await response.arrayBuffer());
    res.send(buffer);
  } catch {
    res.status(404).send('Not found');
  }
}));

export default router; 