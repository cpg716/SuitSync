const prisma = require('../prismaClient');
const logger = require('../utils/logger');

function getDayOfWeek(date) {
  return (date ? new Date(date) : new Date()).getDay();
}

function isWithinSchedule(schedule, startTime, duration) {
  if (!schedule) return false;
  // schedule: { startTime: '09:00', endTime: '17:00' }
  const [startHour, startMin] = schedule.startTime.split(':').map(Number);
  const [endHour, endMin] = schedule.endTime.split(':').map(Number);
  const jobStart = startTime ? new Date(startTime) : new Date();
  const jobEnd = new Date(jobStart.getTime() + duration * 60000);
  const scheduleStart = new Date(jobStart);
  scheduleStart.setHours(startHour, startMin, 0, 0);
  const scheduleEnd = new Date(jobStart);
  scheduleEnd.setHours(endHour, endMin, 0, 0);
  return jobStart >= scheduleStart && jobEnd <= scheduleEnd;
}

async function getTailorWorkload(tailorId, dayOfWeek) {
  // Sum up all durations for the tailor for the day
  const today = new Date();
  today.setHours(0,0,0,0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const parts = await prisma.alterationJobPart.findMany({
    where: {
      assignedTailorId: tailorId,
      scheduledTime: { gte: today, lt: tomorrow },
      status: { in: ['pending', 'in_progress'] },
    },
  });
  return parts.reduce((sum, p) => sum + (p.duration || 60), 0);
}

async function findAvailableTailors(taskTypeId, duration, preferredStart, maxMinutesPerDay = 480) {
  // 1. Find all tailors with ability for this task type (proficiency >= 3)
  const abilities = await prisma.tailorAbility.findMany({
    where: { taskTypeId, proficiency: { gte: 3 } },
    include: { tailor: true },
  });
  if (!Array.isArray(abilities) || abilities.length === 0) return [];
  const dayOfWeek = getDayOfWeek(preferredStart);
  // 2. For each tailor, check schedule, workload, and proficiency
  const candidates = [];
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
  // Only keep available
  const available = candidates.filter(c => c.reason === 'Available');
  if (available.length === 0) return candidates;
  // Sort by: least workload, highest proficiency
  available.sort((a, b) => (a.workload - b.workload) || (b.proficiency - a.proficiency));
  return available;
}

async function autoAssignTailorsForJob(jobId, maxMinutesPerDay = 480) {
  const job = await prisma.alterationJob.findUnique({
    where: { id: Number(jobId) },
    include: { jobParts: true },
  });
  if (!job) throw new Error('Job not found');
  const updates = [];
  const assignmentDetails = [];
  let lastAssignedTailor = null;
  for (const part of job.jobParts) {
    const taskType = await prisma.alterationTaskType.findUnique({ where: { id: part.taskTypeId } });
    const duration = taskType?.defaultDuration || 60;
    const candidates = await findAvailableTailors(part.taskTypeId, duration, part.scheduledTime, maxMinutesPerDay);
    let assignedTailorId = null;
    let reason = 'No available tailor';
    if (Array.isArray(candidates) && candidates.length > 0) {
      // Prefer not to assign the same tailor twice in a row if possible
      let chosen = candidates.find(c => c.tailor.id !== lastAssignedTailor && c.reason === 'Available') || candidates[0];
      assignedTailorId = chosen.tailor.id;
      reason = chosen.reason === 'Available'
        ? `Assigned (workload: ${chosen.workload || 0} min, proficiency: ${chosen.proficiency})`
        : chosen.reason;
      lastAssignedTailor = assignedTailorId;
    }
    updates.push(prisma.alterationJobPart.update({
      where: { id: part.id },
      data: { assignedTailorId, duration },
    }));
    assignmentDetails.push({
      partId: part.id,
      assignedTailorId,
      reason,
      candidates: candidates.map(c => ({
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

module.exports = { autoAssignTailorsForJob }; 