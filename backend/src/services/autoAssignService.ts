import { PrismaClient, AlterationJobStatus } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import logger from '../utils/logger';

const prisma = new PrismaClient().$extends(withAccelerate());

function getDayOfWeek(date?: string | Date): number {
  return (date ? new Date(date) : new Date()).getDay();
}

function isWithinSchedule(schedule: any, startTime: string, duration: number): boolean {
  if (!schedule) return false;
  const [startHour, startMin] = schedule.startTime.split(':').map((n: string) => Number(n));
  const [endHour, endMin] = schedule.endTime.split(':').map((n: string) => Number(n));
  const jobStart = startTime ? new Date(startTime) : new Date();
  const jobEnd = new Date(jobStart.getTime() + duration * 60000);
  const scheduleStart = new Date(jobStart);
  scheduleStart.setHours(startHour, startMin, 0, 0);
  const scheduleEnd = new Date(jobStart);
  scheduleEnd.setHours(endHour, endMin, 0, 0);
  return jobStart >= scheduleStart && jobEnd <= scheduleEnd;
}

async function getTailorWorkload(tailorId: number, dayOfWeek: number): Promise<number> {
  const today = new Date();
  today.setHours(0,0,0,0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const parts = await prisma.alterationJobPart.findMany({
    where: {
      assignedTo: tailorId,
      status: { in: [AlterationJobStatus.NOT_STARTED, AlterationJobStatus.IN_PROGRESS] },
    },
  });
  return parts.reduce((sum: number, p) => sum + (p.estimatedTime || 60), 0);
}

async function findAvailableTailors(abilityId: number, duration: number, preferredStart: string, maxMinutesPerDay = 480): Promise<any[]> {
  const abilities = await prisma.tailorAbility.findMany({
    where: { id: abilityId, proficiency: { gte: 3 } },
    include: { tailor: true },
  });
  if (!Array.isArray(abilities) || abilities.length === 0) return [];
  const dayOfWeek = getDayOfWeek(preferredStart);
  const candidates: any[] = [];
  for (const ability of abilities) {
    const tailor = ability.tailor;
    const schedule = await prisma.tailorSchedule.findFirst({
      where: { tailorId: tailor.id, dayOfWeek },
    });
    if (!schedule || !isWithinSchedule(schedule, preferredStart, duration)) {
      candidates.push({ tailor, proficiency: ability.proficiency, reason: 'Out of schedule' });
      continue;
    }
    const workload = await getTailorWorkload(tailor.id, dayOfWeek);
    if (workload + duration > maxMinutesPerDay) {
      candidates.push({ tailor, proficiency: ability.proficiency, reason: 'Max workload reached' });
      continue;
    }
    candidates.push({ tailor, proficiency: ability.proficiency, workload, reason: 'Available' });
  }
  const available = candidates.filter((c: { reason: string }) => c.reason === 'Available');
  if (available.length === 0) return candidates;
  available.sort((a, b) => (a.workload - b.workload) || (b.proficiency - a.proficiency));
  return available;
}

export async function autoAssignTailorsForJob(jobId: number, maxMinutesPerDay = 480): Promise<any[]> {
  const job = await prisma.alterationJob.findUnique({
    where: { id: Number(jobId) },
    include: { jobParts: { include: { ability: true } } },
  });
  if (!job) throw new Error('Job not found');
  const updates = [];
  const assignmentDetails = [];
  let lastAssignedTailor: string | null = null;
  for (const part of job.jobParts) {
    const duration = part.estimatedTime || 60;
    let candidates: any[] = [];
    if (part.abilityId) {
      candidates = await findAvailableTailors(part.abilityId, duration, new Date().toISOString(), maxMinutesPerDay);
    }
    let assignedTailorId = null;
    let reason = 'No available tailor';
    if (Array.isArray(candidates) && candidates.length > 0) {
      let chosen = candidates.find(c => c.tailor.id !== lastAssignedTailor && c.reason === 'Available') || candidates[0];
      assignedTailorId = chosen.tailor.id;
      reason = chosen.reason === 'Available'
        ? `Assigned (workload: ${chosen.workload || 0} min, proficiency: ${chosen.proficiency})`
        : chosen.reason;
      lastAssignedTailor = assignedTailorId;
    }
    updates.push(prisma.alterationJobPart.update({
      where: { id: part.id },
      data: { assignedTo: assignedTailorId },
    }));
    assignmentDetails.push({
      partId: part.id,
      assignedTo: assignedTailorId,
      reason,
      candidates: candidates.map((c: any) => ({
        tailorId: c.tailor.id,
        name: c.tailor.name,
        workload: c.workload,
        proficiency: c.proficiency,
        reason: c.reason
      }))
    });
  }
  await Promise.all(updates);
  logger.info(`[AutoAssign] Completed enhanced auto-assignment for job ${jobId}`);
  return assignmentDetails;
} 