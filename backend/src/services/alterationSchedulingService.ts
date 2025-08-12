import { PrismaClient, AlterationJobStatus, GarmentPartType } from '@prisma/client';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export interface ScheduleOptions {
  startDate?: Date; // earliest day to schedule
  respectNoThursday?: boolean; // default true
}

function isThursday(d: Date): boolean {
  // 0=Sun .. 6=Sat
  return d.getUTCDay() === 4;
}

function startOfDayUTC(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  return d;
}

function addDaysUTC(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function nextThursday(from: Date): Date {
  const d = startOfDayUTC(from);
  const wd = d.getUTCDay();
  const diff = (4 - wd + 7) % 7; // 4=Thu
  return addDaysUTC(d, diff === 0 ? 7 : diff); // next Thu (not today if already Thu)
}

function isJacket(partType: GarmentPartType): boolean {
  return partType === 'JACKET' || partType === 'VEST' || partType === 'SHIRT';
}

function isPants(partType: GarmentPartType): boolean {
  return partType === 'PANTS' || partType === 'SKIRT';
}

export async function getOrCreateWorkDay(date: Date): Promise<any> {
  const day = startOfDayUTC(date);
  let plan = await prisma.workDayPlan.findUnique({ where: { date: day } });
  if (!plan) {
    plan = await prisma.workDayPlan.create({ data: { date: day } });
  }
  return plan;
}

export async function findNextSchedulableDay(from: Date, respectNoThursday = true): Promise<Date> {
  let d = startOfDayUTC(from);
  while (true) {
    // Global holidays/closures
    const holiday = await prisma.globalHoliday.findFirst({ where: { date: d, isClosed: true } });
    const isClosed = !!holiday;

    if (!isClosed) {
      if (!(respectNoThursday && isThursday(d))) {
        // Also honor schedule exceptions marked isOff for all users (shop closed), but that is per user.
        return d;
      }
    }
    d = addDaysUTC(d, 1);
  }
}

export async function computeCapacity(planId: number): Promise<{ jacketsLeft: number; pantsLeft: number }> {
  const plan = await prisma.workDayPlan.findUnique({ where: { id: planId } });
  if (!plan) return { jacketsLeft: 0, pantsLeft: 0 };
  return {
    jacketsLeft: Math.max(0, plan.jacketCapacity - plan.assignedJackets),
    pantsLeft: Math.max(0, plan.pantsCapacity - plan.assignedPants),
  };
}

async function getWorkingTailorsForDay(day: Date): Promise<{ id: number; name: string }[]> {
  const weekday = day.getUTCDay();
  // Disallow Thursday globally
  if (weekday === 4) return [];

  const tailors = await prisma.user.findMany({ where: { role: 'tailor', isActive: true, canLoginToSuitSync: true }, include: { userSchedules: true } });
  const active: { id: number; name: string }[] = [];
  for (const t of tailors) {
    // Prefer recurring schedule (weekStart null)
    const recurring = t.userSchedules.find(s => s.weekStart === null);
    if (recurring) {
      const days = (recurring.days as any[]) || [];
      const d = days[weekday] || { isOff: false, blocks: [] };
      if (!d.isOff && Array.isArray(d.blocks) && d.blocks.length > 0) {
        active.push({ id: t.id, name: t.name });
        continue;
      }
    }
    // Fallback: assume available if no schedule defined and not Thursday
    if (!recurring) active.push({ id: t.id, name: t.name });
  }
  return active;
}

async function getTailorWorkloadOnDay(tailorId: number, day: Date): Promise<number> {
  const next = addDaysUTC(day, 1);
  const parts = await prisma.alterationJobPart.findMany({
    where: { assignedTo: tailorId, scheduledFor: { gte: day, lt: next }, status: { in: [AlterationJobStatus.NOT_STARTED, AlterationJobStatus.IN_PROGRESS] as any } },
    select: { estimatedTime: true },
  });
  return parts.reduce((sum, p) => sum + (p.estimatedTime || 60), 0);
}

export async function scheduleJobParts(jobId: number, options: ScheduleOptions = {}): Promise<{ partId: number; workDay: Date; assignedTo?: number }[]> {
  const { startDate = new Date(), respectNoThursday = true } = options;
  const job = await prisma.alterationJob.findUnique({
    where: { id: Number(jobId) },
    include: {
      party: true,
      partyMember: true,
      jobParts: true,
    },
  });
  if (!job) throw new Error('Job not found');

  const results: { partId: number; workDay: Date; assignedTo?: number }[] = [];

  // Determine due date: provided or derived from party.eventDate (7 days before). If still none, use +14 days from today.
  let targetDue: Date | undefined = job.dueDate
    || (job.party?.eventDate ? addDaysUTC(new Date(job.party.eventDate), -7) : undefined)
    || addDaysUTC(startOfDayUTC(new Date()), 14);

  // For scheduling target: 2–3 days before due date, unless created within 3 days of due date → day before due date.
  let preferredStart = addDaysUTC(startOfDayUTC(targetDue), -3);
  if (addDaysUTC(startOfDayUTC(new Date()), 3) >= startOfDayUTC(targetDue)) {
    preferredStart = addDaysUTC(startOfDayUTC(targetDue), -1);
  }

  // Start date for search
  let initial = preferredStart > startDate ? preferredStart : startDate;
  let current = await findNextSchedulableDay(initial, respectNoThursday && !job.lastMinute);
  if (job.lastMinute) {
    current = nextThursday(initial);
  }

  for (const part of job.jobParts) {
    // Skip already scheduled
    if (part.scheduledFor) {
      results.push({ partId: part.id, workDay: new Date(part.scheduledFor), assignedTo: part.assignedTo ?? undefined });
      continue;
    }

    // Find a day with capacity
    while (true) {
      const plan = await getOrCreateWorkDay(current);
      const isJ = isJacket(part.partType);
      const isP = isPants(part.partType);

      if (!isJ && !isP) {
        // Treat as jacket unit by default
        logger.warn(`[Scheduling] Unknown partType ${part.partType} for part ${part.id}; counting as jacket.`);
      }

      const jacketsLeft = Math.max(0, plan.jacketCapacity - plan.assignedJackets);
      const pantsLeft = Math.max(0, plan.pantsCapacity - plan.assignedPants);
      const canFit = (isJ && jacketsLeft > 0) || (isP && pantsLeft > 0) || (!isJ && !isP && jacketsLeft > 0);

      // Verify within due date if any
      // Last-minute jobs may use Thursday; otherwise skip
      const exceedsDue = targetDue ? current > startOfDayUTC(targetDue) : false;

      if (canFit && !exceedsDue && !plan.isClosed) {
        // Assign to least-loaded active tailor for that day (if any)
        let assignTo: number | undefined = undefined;
        const activeTailors = await getWorkingTailorsForDay(current);
        if (activeTailors.length > 0) {
          let best: { id: number; load: number } | null = null;
          for (const t of activeTailors) {
            const load = await getTailorWorkloadOnDay(t.id, current);
            if (!best || load < best.load) best = { id: t.id, load };
          }
          assignTo = best?.id;
        }
        // Assign to this day and update counters
        await prisma.alterationJobPart.update({
          where: { id: part.id },
          data: {
            scheduledFor: current,
            workDay: { connect: { id: plan.id } },
            assignedUser: assignTo ? { connect: { id: assignTo } } : { disconnect: true },
          },
        });
        await prisma.workDayPlan.update({
          where: { id: plan.id },
          data: {
            assignedJackets: plan.assignedJackets + (isJ || (!isJ && !isP) ? 1 : 0),
            assignedPants: plan.assignedPants + (isP ? 1 : 0),
          },
        });
        results.push({ partId: part.id, workDay: current, assignedTo: assignTo });
        break;
      }

      // Move to next day respecting rules. If lastMinute → next Thursday only
      if (job.lastMinute) {
        current = nextThursday(addDaysUTC(current, 1));
      } else {
        current = await findNextSchedulableDay(addDaysUTC(current, 1), respectNoThursday);
      }
    }
  }

  return results;
}

export async function rebalanceDay(date: Date): Promise<void> {
  // Optional future: pull excess parts to next days. Not implemented here.
  logger.info(`[Scheduling] Rebalance requested for ${date.toISOString().slice(0,10)} (noop)`);
}

export async function bulkAutoScheduleUnplanned(startDate?: Date): Promise<number> {
  const where = {
    status: { in: [AlterationJobStatus.NOT_STARTED, AlterationJobStatus.IN_PROGRESS] as any },
  } as any;
  const jobs = await prisma.alterationJob.findMany({ where, include: { jobParts: true, party: true } });
  let count = 0;
  for (const job of jobs) {
    const hasUnscheduled = job.jobParts.some(p => !p.scheduledFor);
    if (!hasUnscheduled) continue;
    await scheduleJobParts(job.id, { startDate, respectNoThursday: true });
    count += 1;
  }
  return count;
}

export default {
  scheduleJobParts,
  getOrCreateWorkDay,
  computeCapacity,
  findNextSchedulableDay,
  bulkAutoScheduleUnplanned,
  rebalanceDay,
};


