import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Scheduling from '../services/alterationSchedulingService.js';
import logger from '../utils/logger';
import AuditLogService, { logChange } from '../services/AuditLogService';

const prisma = new PrismaClient();

/**
 * Create alterations job after 2nd appointment (alterations_fitting)
 */
export async function createAlterationsJob(req: Request, res: Response) {
  try {
    const { partyMemberId, alterations } = req.body;
    
    if (!partyMemberId || !alterations) {
      return res.status(400).json({ error: 'partyMemberId and alterations are required' });
    }

    // Get party member
    const partyMember = await prisma.partyMember.findUnique({
      where: { id: partyMemberId },
      include: { party: true }
    });

    if (!partyMember) {
      return res.status(404).json({ error: 'Party member not found' });
    }

    // Create alteration job
    const alterationJob = await prisma.alterationJob.create({
      data: {
        jobNumber: `AJ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        partyId: partyMember.partyId,
        partyMemberId: partyMember.id,
        status: 'NOT_STARTED',
        notes: `Alterations for ${partyMember.role} - ${partyMember.notes}`,
        qrCode: `QR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }
    });

    // Create job parts based on alterations
    const jobParts = [];
    for (const [partName, partAlterations] of Object.entries(alterations)) {
      const jobPart = await prisma.alterationJobPart.create({
        data: {
          jobId: alterationJob.id,
          partName: partName,
          partType: getPartType(partName),
          status: 'NOT_STARTED',
          qrCode: `QR-PART-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          notes: JSON.stringify(partAlterations)
        }
      });

      // Create tasks for each alteration
      for (const alteration of partAlterations as string[]) {
        await prisma.alterationTask.create({
          data: {
            partId: jobPart.id,
            taskName: alteration,
            taskType: 'ALTERATION',
            status: 'NOT_STARTED'
          }
        });
      }

      jobParts.push(jobPart);
    }

    // Update party member status to being_altered
    await prisma.partyMember.update({
      where: { id: partyMemberId },
      data: { 
        status: 'being_altered',
        alteredAt: new Date()
      }
    });

    // Log audit event
    await logChange(
      (req as any).user?.id,
      'create',
      'AlterationJob',
      alterationJob.id,
      {
        partyMemberId,
        alterations,
        jobParts: jobParts.length
      },
      req
    );

    // Attempt auto-scheduling (skip Thursdays)
    try {
      await Scheduling.scheduleJobParts(alterationJob.id, { respectNoThursday: true });
    } catch (err) {
      logger.warn('Auto-schedule failed for new alterations job', err);
    }

    res.json({ alterationJob, jobParts, message: 'Alterations job created and scheduled' });

  } catch (error) {
    logger.error('Error creating alterations job:', error);
    res.status(500).json({ error: 'Failed to create alterations job' });
  }
}

/**
 * Create alteration job with detailed parts and tasks
 */
export async function createAlteration(req: Request, res: Response) {
  try {
    const { customerId, partyId, partyMemberId, notes, dueDate, rushOrder, jobParts, lastMinute } = req.body;
    
    if (!jobParts || !Array.isArray(jobParts) || jobParts.length === 0) {
      return res.status(400).json({ error: 'jobParts array is required and must not be empty' });
    }

    // Validate that either customerId or partyId is provided
    if (!customerId && !partyId) {
      return res.status(400).json({ error: 'Either customerId or partyId must be provided' });
    }

    // Guard: if party provided and dueDate is after eventDate → reject
    if (partyId && dueDate) {
      const party = await prisma.party.findUnique({ where: { id: Number(partyId) } });
      if (party?.eventDate && new Date(dueDate) > new Date(party.eventDate)) {
        return res.status(400).json({ error: 'Due date cannot be after the party/event date' });
      }
    }

    // Generate unique job number and QR code
    const jobNumber = `AJ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const qrCode = `QR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create alteration job
    const alterationJob = await prisma.alterationJob.create({
      data: {
        jobNumber,
        qrCode,
        customerId: customerId ? Number(customerId) : null,
        partyId: partyId ? Number(partyId) : null,
        partyMemberId: partyMemberId ? Number(partyMemberId) : null,
        status: 'NOT_STARTED',
        notes: notes || '',
        dueDate: dueDate ? new Date(dueDate) : null,
         rushOrder: rushOrder || false,
         lastMinute: !!lastMinute
      }
    });

    // Create job parts and tasks
    const createdJobParts = [];
    for (const part of jobParts) {
      const partQrCode = `QR-PART-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const jobPart = await prisma.alterationJobPart.create({
        data: {
          jobId: alterationJob.id,
          partName: part.partName,
          partType: part.partType,
          status: 'NOT_STARTED',
          qrCode: partQrCode,
          notes: part.notes || '',
          priority: part.priority || 'NORMAL',
          estimatedTime: part.estimatedTime || null
        }
      });

      // Create tasks for this part
      if (part.tasks && Array.isArray(part.tasks)) {
        for (const task of part.tasks) {
          if (task.taskName && task.taskName.trim()) {
            await prisma.alterationTask.create({
              data: {
                partId: jobPart.id,
                taskName: task.taskName.trim(),
                taskType: (task.taskType || 'alteration').toUpperCase() as any,
                status: 'NOT_STARTED',
                measurements: task.measurements || null,
                notes: task.notes || null
              }
            });
          }
        }
      }

      createdJobParts.push(jobPart);
    }

    // Log audit event
    await logChange(
      (req as any).user?.id,
      'create',
      'AlterationJob',
      alterationJob.id,
      {
        customerId,
        partyId,
        partyMemberId,
        jobParts: createdJobParts.length,
        totalTasks: jobParts.reduce((sum, part) => sum + (part.tasks?.length || 0), 0)
      },
      req
    );

    // Auto-schedule created job's parts
    try {
      await Scheduling.scheduleJobParts(alterationJob.id, { respectNoThursday: true });
    } catch (err) {
      logger.warn('Auto-schedule failed for created alteration', err);
    }

    res.json({ success: true, alterationJob, jobParts: createdJobParts, message: 'Alteration job created and scheduled' });

  } catch (error) {
    logger.error('Error creating alteration job:', error);
    res.status(500).json({ error: 'Failed to create alteration job' });
  }
}

/**
 * Get alterations job with parts and tasks
 */
export async function getAlterationsJob(req: Request, res: Response) {
  try {
    const { jobId } = req.params;
    
    const alterationJob = await prisma.alterationJob.findUnique({
      where: { id: Number(jobId) },
      include: {
        party: true,
        partyMember: true,
        jobParts: {
          include: {
            tasks: true,
            assignedUser: true
          }
        }
      }
    });

    if (!alterationJob) {
      return res.status(404).json({ error: 'Alteration job not found' });
    }

    res.json(alterationJob);

  } catch (error) {
    logger.error('Error getting alterations job:', error);
    res.status(500).json({ error: 'Failed to get alterations job' });
  }
}

/**
 * Scan QR code to mark part as started/finished or check status
 */
export async function scanQRCode(req: Request, res: Response) {
  try {
    const { qrCode, action, tailorId } = req.body;
    
    if (!qrCode || !action) {
      return res.status(400).json({ error: 'qrCode and action are required' });
    }

    // Find the job part by QR code
    const jobPart = await prisma.alterationJobPart.findUnique({
      where: { qrCode },
      include: {
        job: {
          include: {
            party: {
              include: {
                customer: true
              }
            },
            partyMember: true,
            customer: true,
            jobParts: {
              include: {
                tasks: true
              },
              orderBy: {
                partName: 'asc'
              }
            }
          }
        },
        tasks: true
      }
    });

    if (!jobPart) {
      return res.status(404).json({ error: 'QR code not found' });
    }

    // Handle status check (just return job info)
    if (action === 'status_check') {
      return res.json({
        success: true,
        job: jobPart.job,
        message: 'Job found successfully'
      });
    }

    // Require a valid tailorId and attribute scan correctly
    const scannedById = typeof tailorId === 'number' ? tailorId : (req as any).user?.id;
    if (!scannedById) {
      return res.status(400).json({ error: 'tailorId is required' });
    }

    // Log the scan
    await prisma.qRScanLog.create({
      data: {
        qrCode,
        partId: jobPart.id,
        scannedBy: scannedById,
        scanType: action === 'start' ? 'START_WORK' : 'FINISH_WORK',
        location: req.ip,
        result: 'SUCCESS'
      }
    });

    let newStatus = jobPart.status;
    let completedTasks = 0;

    if (action === 'start') {
      newStatus = 'IN_PROGRESS';
      // Mark all tasks as started
      await prisma.alterationTask.updateMany({
        where: { partId: jobPart.id },
        data: { 
          status: 'IN_PROGRESS',
          startTime: new Date()
        }
      });
    } else if (action === 'finish') {
      // Mark all tasks as complete
      await prisma.alterationTask.updateMany({
        where: { partId: jobPart.id },
        data: { 
          status: 'COMPLETE',
          finishTime: new Date()
        }
      });
      
      completedTasks = jobPart.tasks.length;
      newStatus = 'COMPLETE';
    }

    // Update job part status
    await prisma.alterationJobPart.update({
      where: { id: jobPart.id },
      data: { status: newStatus }
    });

    // Check if all parts are complete
    const allParts = await prisma.alterationJobPart.findMany({
      where: { jobId: jobPart.job.id }
    });

    const allComplete = allParts.every(part => part.status === 'COMPLETE');

    if (allComplete) {
      // Update job status to complete
      await prisma.alterationJob.update({
        where: { id: jobPart.job.id },
        data: { status: 'COMPLETE' }
      });

      // Update party member status to ready_for_pickup
      if (jobPart.job.partyMemberId) {
        await prisma.partyMember.update({
          where: { id: jobPart.job.partyMemberId },
          data: { 
            status: 'ready_for_pickup',
            readyForPickupAt: new Date()
          }
        });
      }
    }

    // Get updated job data
    const updatedJob = await prisma.alterationJob.findUnique({
      where: { id: jobPart.job.id },
      include: {
        party: {
          include: {
            customer: true
          }
        },
        partyMember: true,
        customer: true,
        jobParts: {
          include: {
            tasks: true
          },
          orderBy: {
            partName: 'asc'
          }
        }
      }
    });

    res.json({
      success: true,
      job: updatedJob,
      jobPart: {
        id: jobPart.id,
        partName: jobPart.partName,
        status: newStatus,
        completedTasks
      },
      allComplete,
      message: `Part ${action === 'start' ? 'started' : 'completed'} successfully`
    });

  } catch (error) {
    logger.error('Error scanning QR code:', error);
    res.status(500).json({ error: 'Failed to scan QR code' });
  }
}

/**
 * Schedule pickup date
 */
export async function schedulePickup(req: Request, res: Response) {
  try {
    const { partyMemberId, pickupDate } = req.body;
    
    if (!partyMemberId || !pickupDate) {
      return res.status(400).json({ error: 'partyMemberId and pickupDate are required' });
    }

    const pickupDateTime = new Date(pickupDate);
    const today = new Date();
    const minPickupDate = new Date(today.getTime() + (7 * 24 * 60 * 60 * 1000)); // 7 days from now

    if (pickupDateTime < minPickupDate) {
      return res.status(400).json({ 
        error: 'Pickup date must be at least 7 days from today',
        minPickupDate: minPickupDate.toISOString().split('T')[0]
      });
    }

    // Update party member with pickup date
    const updatedMember = await prisma.partyMember.update({
      where: { id: partyMemberId },
      data: { pickupDate: pickupDateTime },
      include: {
        party: true
      }
    });

    // Log audit event
    await logChange(
      (req as any).user?.id,
      'update',
      'PartyMember',
      partyMemberId,
      {
        pickupDate: pickupDateTime,
        partyName: updatedMember.party?.name
      },
      req
    );

    res.json({
      success: true,
      partyMember: updatedMember,
      message: 'Pickup date scheduled successfully'
    });

  } catch (error) {
    logger.error('Error scheduling pickup:', error);
    res.status(500).json({ error: 'Failed to schedule pickup' });
  }
}

/**
 * Generate alterations ticket for printing
 */
export async function generateAlterationsTicket(req: Request, res: Response) {
  try {
    const { jobId } = req.params;
    
    const alterationJob = await prisma.alterationJob.findUnique({
      where: { id: Number(jobId) },
      include: {
        party: {
          include: {
            customer: true
          }
        },
        partyMember: true,
        customer: true,
        jobParts: {
          include: {
            tasks: true
          }
        }
      }
    });

    if (!alterationJob) {
      return res.status(404).json({ error: 'Alteration job not found' });
    }

    // Get customer info
    const customer = alterationJob.customer || alterationJob.party?.customer;
    const memberName = alterationJob.partyMember?.notes || customer?.name || 'Unknown';
    const memberRole = alterationJob.partyMember?.role || 'Customer';
    const partyName = alterationJob.party?.name;
    const eventDate = alterationJob.party?.eventDate;
    const customerPhone = customer?.phone || 'No phone';

    // Get measurements
    let measurements = null;
    if (customer) {
      const customerMeasurements = await prisma.measurements.findFirst({
        where: { customerId: customer.id }
      });
      if (customerMeasurements) {
        measurements = {
          chest: customerMeasurements.chest,
          waistJacket: customerMeasurements.waistJacket,
          hips: customerMeasurements.hips,
          shoulderWidth: customerMeasurements.shoulderWidth,
          sleeveLength: customerMeasurements.sleeveLength,
          neck: customerMeasurements.neck,
          inseam: customerMeasurements.inseam,
          outseam: customerMeasurements.outseam
        };
      }
    }

    // Generate ticket data
    const ticketData = {
      jobNumber: alterationJob.jobNumber,
      qrCode: alterationJob.qrCode,
      partyName,
      memberName,
      memberRole,
      eventDate,
      customerPhone,
      measurements,
      createdAt: alterationJob.createdAt,
      parts: alterationJob.jobParts?.map(part => ({
        partName: part.partName,
        qrCode: part.qrCode,
        alterations: part.tasks?.map(task => task.taskName) || []
      })) || []
    };

    res.json({
      success: true,
      ticketData,
      message: 'Alterations ticket generated successfully'
    });

  } catch (error) {
    logger.error('Error generating alterations ticket:', error);
    res.status(500).json({ error: 'Failed to generate alterations ticket' });
  }
}

/**
 * Get all alterations with status, due dates, and party information
 */
export async function getAllAlterations(req: Request, res: Response) {
  try {
    const { search, status, tailorId } = req.query;
    
    // Build where clause
    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    if (tailorId) {
      where.tailorId = Number(tailorId);
    }
    
    if (search) {
      where.OR = [
        { jobNumber: { contains: search as string, mode: 'insensitive' } },
        { notes: { contains: search as string, mode: 'insensitive' } },
        { partyMember: { 
          notes: { contains: search as string, mode: 'insensitive' }
        }},
        { party: { 
          name: { contains: search as string, mode: 'insensitive' }
        }},
        { customer: { 
          name: { contains: search as string, mode: 'insensitive' }
        }}
      ];
    }

    const alterations = await prisma.alterationJob.findMany({
      where,
      include: {
        party: { include: { customer: true } },
        partyMember: true,
        customer: true,
        tailor: true,
        jobParts: { include: { tasks: true, assignedUser: true } },
      },
      // Use a simple, reliable order in SQL; we'll refine ordering in JS using computed due dates
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
    });

    // Calculate due dates and enrich the data
    const enrichedAlterations = alterations.map(alteration => {
      let dueDate: Date | null = null;
      let dueDateType: 'custom' | 'wedding' | null = null;
      
      // If there's a custom due date, use it
      if (alteration.dueDate) {
        dueDate = alteration.dueDate;
        dueDateType = 'custom';
      }
      // Otherwise, calculate 7 days before wedding
      else if (alteration.party?.eventDate) {
        dueDate = new Date(alteration.party.eventDate);
        dueDate.setDate(dueDate.getDate() - 7);
        dueDateType = 'wedding';
      }
      
      // Calculate completion percentage
      const totalParts = alteration.jobParts.length;
      const completedParts = alteration.jobParts.filter(part => part.status === 'COMPLETE').length;
      const completionPercentage = totalParts > 0 ? Math.round((completedParts / totalParts) * 100) : 0;
      
      // Check if overdue
      const isOverdue = dueDate ? new Date() > dueDate : false;
      
      // Ensure parts are consistently ordered by name for display
      const sortedParts = [...alteration.jobParts].sort((a: any, b: any) => String(a.partName || '').localeCompare(String(b.partName || '')));

      return {
        ...alteration,
        calculatedDueDate: dueDate,
        dueDateType,
        completionPercentage,
        isOverdue,
        totalParts,
        completedParts,
        jobParts: sortedParts,
      };
    });

    // Final client-facing order: computed due date (earliest first), then createdAt
    const ordered = [...enrichedAlterations].sort((a, b) => {
      const ad = a.calculatedDueDate ? new Date(a.calculatedDueDate as any).getTime() : Number.MAX_SAFE_INTEGER;
      const bd = b.calculatedDueDate ? new Date(b.calculatedDueDate as any).getTime() : Number.MAX_SAFE_INTEGER;
      if (ad !== bd) return ad - bd;
      return new Date(a.createdAt as any).getTime() - new Date(b.createdAt as any).getTime();
    });

    res.json({
      alterations: ordered,
      summary: {
        total: ordered.length,
        overdue: ordered.filter(a => a.isOverdue).length,
        inProgress: ordered.filter(a => a.status === 'IN_PROGRESS').length,
        notStarted: ordered.filter(a => a.status === 'NOT_STARTED').length,
        complete: ordered.filter(a => a.status === 'COMPLETE').length,
      },
    });

  } catch (error) {
    // Log full error details to aid diagnosis in production
    try { console.error('Error getting alterations:', (error as any)?.message, (error as any)?.stack); } catch {}
    logger.error('Error getting alterations:', error);
    res.status(500).json({ error: 'Failed to get alterations' });
  }
}

/**
 * Update alteration due date
 */
export async function updateAlterationDueDate(req: Request, res: Response) {
  try {
    const { jobId } = req.params;
    const { dueDate } = req.body;
    
    if (!dueDate) {
      return res.status(400).json({ error: 'dueDate is required' });
    }

    // Guard: cannot set after party event date
    const existing = await prisma.alterationJob.findUnique({
      where: { id: Number(jobId) },
      include: { party: true }
    });

    if (existing?.party?.eventDate && new Date(dueDate) > new Date(existing.party.eventDate)) {
      return res.status(400).json({ error: 'Due date cannot be after the party/event date' });
    }

    const alterationJob = await prisma.alterationJob.update({
      where: { id: Number(jobId) },
      data: { 
        dueDate: new Date(dueDate)
      },
      include: {
        party: true,
        partyMember: true
      }
    });

    // Log audit event
    await logChange(
      (req as any).user?.id,
      'update',
      'AlterationJob',
      alterationJob.id,
      {
        dueDate: new Date(dueDate),
        partyName: alterationJob.party?.name
      },
      req
    );

    res.json({
      success: true,
      alterationJob,
      message: 'Due date updated successfully'
    });

  } catch (error) {
    logger.error('Error updating alteration due date:', error);
    res.status(500).json({ error: 'Failed to update due date' });
  }
}

/**
 * Daily board summary for alterations capacity and scheduled items
 */
export async function getWorkDayBoard(req: Request, res: Response) {
  try {
    const start = new Date(String(req.query.start || new Date().toISOString().slice(0,10)) + 'T00:00:00Z');
    const days = Math.min(60, Math.max(1, parseInt(String(req.query.days || '14'))));
    const out: any[] = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + i);
      const plan = await (await import('../services/alterationSchedulingService.js')).default.getOrCreateWorkDay(date);
      const weekday = date.getUTCDay();
      const isThursday = weekday === 4;
      const parts = await prisma.alterationJobPart.findMany({
        where: { scheduledFor: { gte: date, lt: new Date(date.getTime() + 24*60*60*1000) } },
        include: { job: true }
      });
      const lastMinuteParts = parts.filter(p => p.job?.lastMinute);
      out.push({
        date,
        jacketCapacity: plan.jacketCapacity,
        pantsCapacity: plan.pantsCapacity,
        assignedJackets: plan.assignedJackets,
        assignedPants: plan.assignedPants,
        jacketsLeft: Math.max(0, plan.jacketCapacity - plan.assignedJackets),
        pantsLeft: Math.max(0, plan.pantsCapacity - plan.assignedPants),
        isThursday,
        isClosed: !!plan.isClosed,
        totalParts: parts.length,
        lastMinuteParts: lastMinuteParts.length,
        notes: plan.notes || (isThursday ? 'Thursday: only last-minute allowed' : undefined),
      });
    }
    res.json({ days: out });
  } catch (error) {
    logger.error('Error building work day board:', error);
    res.status(500).json({ error: 'Failed to build board' });
  }
}

/**
 * Items scheduled for a specific date (YYYY-MM-DD)
 */
export async function getWorkDayItems(req: Request, res: Response) {
  try {
    const { date } = req.params;
    const day = new Date(date + 'T00:00:00Z');
    const next = new Date(day.getTime() + 24*60*60*1000);
    const parts = await prisma.alterationJobPart.findMany({
      where: { scheduledFor: { gte: day, lt: next } },
      include: {
        job: { include: { party: true, partyMember: true, tailor: true } },
        assignedUser: true,
      }
    });
    res.json({ items: parts });
  } catch (error) {
    logger.error('Error getting work day items:', error);
    res.status(500).json({ error: 'Failed to get items' });
  }
}

// Helper function to map part names to GarmentPartType
function getPartType(partName: string): 'JACKET' | 'PANTS' | 'VEST' | 'SHIRT' | 'DRESS' | 'SKIRT' | 'OTHER' {
  const partMap: { [key: string]: 'JACKET' | 'PANTS' | 'VEST' | 'SHIRT' | 'DRESS' | 'SKIRT' | 'OTHER' } = {
    'jacket': 'JACKET',
    'pants': 'PANTS',
    'vest': 'VEST',
    'shirt': 'SHIRT',
    'dress': 'DRESS',
    'skirt': 'SKIRT'
  };
  
  return partMap[partName.toLowerCase()] || 'OTHER';
}

// Missing controller functions for routes
export async function listAlterations(req: Request, res: Response) {
  try {
    const alterations = await prisma.alterationJob.findMany({
      include: {
        party: true,
        partyMember: true,
        customer: true,
        jobParts: {
          include: {
            tasks: true,
            assignedUser: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(alterations);
  } catch (error) {
    logger.error('Error listing alterations:', error);
    res.status(500).json({ error: 'Failed to list alterations' });
  }
}

export async function getAlteration(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    const alteration = await prisma.alterationJob.findUnique({
      where: { id: Number(id) },
      include: {
        party: true,
        partyMember: true,
        customer: true,
        jobParts: {
          include: {
            tasks: true,
            assignedUser: true
          }
        }
      }
    });

    if (!alteration) {
      return res.status(404).json({ error: 'Alteration not found' });
    }

    res.json(alteration);
  } catch (error) {
    logger.error('Error getting alteration:', error);
    res.status(500).json({ error: 'Failed to get alteration' });
  }
}

export async function updateAlteration(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const alteration = await prisma.alterationJob.update({
      where: { id: Number(id) },
      data: updateData,
      include: {
        party: true,
        partyMember: true,
        customer: true,
        jobParts: {
          include: {
            tasks: true,
            assignedUser: true
          }
        }
      }
    });

    res.json(alteration);
  } catch (error) {
    logger.error('Error updating alteration:', error);
    res.status(500).json({ error: 'Failed to update alteration' });
  }
}

export async function deleteAlteration(req: Request, res: Response) {
  try {
    const { id } = req.params;

    await prisma.alterationJob.delete({
      where: { id: Number(id) }
    });

    res.json({ message: 'Alteration deleted successfully' });
  } catch (error) {
    logger.error('Error deleting alteration:', error);
    res.status(500).json({ error: 'Failed to delete alteration' });
  }
}

export async function getAlterationJobs(req: Request, res: Response) {
  try {
    const jobs = await prisma.alterationJob.findMany({
      include: {
        party: true,
        partyMember: true,
        customer: true,
        jobParts: {
          include: {
            tasks: true,
            assignedUser: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(jobs);
  } catch (error) {
    logger.error('Error getting alteration jobs:', error);
    res.status(500).json({ error: 'Failed to get alteration jobs' });
  }
}

export async function updateAlterationJob(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const job = await prisma.alterationJob.update({
      where: { id: Number(id) },
      data: updateData,
      include: {
        party: true,
        partyMember: true,
        customer: true,
        jobParts: {
          include: {
            tasks: true,
            assignedUser: true
          }
        }
      }
    });

    res.json(job);
  } catch (error) {
    logger.error('Error updating alteration job:', error);
    res.status(500).json({ error: 'Failed to update alteration job' });
  }
}

export async function deleteAlterationJob(req: Request, res: Response) {
  try {
    const { id } = req.params;

    await prisma.alterationJob.delete({
      where: { id: Number(id) }
    });

    res.json({ message: 'Alteration job deleted successfully' });
  } catch (error) {
    logger.error('Error deleting alteration job:', error);
    res.status(500).json({ error: 'Failed to delete alteration job' });
  }
}

export async function getScanLogs(req: Request, res: Response) {
  try {
    const logs = await prisma.qRScanLog.findMany({
      include: {
        user: true,
        part: {
          include: {
            job: true
          }
        }
      },
      orderBy: { timestamp: 'desc' }
    });

    res.json(logs);
  } catch (error) {
    logger.error('Error getting scan logs:', error);
    res.status(500).json({ error: 'Failed to get scan logs' });
  }
}

export async function getDashboardStats(req: Request, res: Response) {
  try {
    const [
      totalJobs,
      inProgressJobs,
      completedJobs,
      overdueJobs
    ] = await Promise.all([
      prisma.alterationJob.count(),
      prisma.alterationJob.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.alterationJob.count({ where: { status: 'COMPLETE' } }),
      prisma.alterationJob.count({
        where: {
          dueDate: { lt: new Date() },
          status: { not: 'COMPLETE' }
        }
      })
    ]);

    res.json({
      totalJobs,
      inProgressJobs,
      completedJobs,
      overdueJobs
    });
  } catch (error) {
    logger.error('Error getting dashboard stats:', error);
    res.status(500).json({ error: 'Failed to get dashboard stats' });
  }
}

export async function updateWorkflowStep(req: Request, res: Response) {
  try {
    const { jobId, stepId } = req.params;
    const { completed, notes } = req.body;

    const step = await prisma.alterationWorkflowStep.update({
      where: { id: Number(stepId) },
      data: {
        completed: completed || false,
        completedAt: completed ? new Date() : null,
        completedBy: completed ? (req as any).user?.id : null,
        notes
      }
    });

    res.json(step);
  } catch (error) {
    logger.error('Error updating workflow step:', error);
    res.status(500).json({ error: 'Failed to update workflow step' });
  }
}

export async function autoAssignTailors(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const results = await Scheduling.scheduleJobParts(Number(id), { respectNoThursday: true });
    res.json({ success: true, results });
  } catch (error) {
    logger.error('Error auto-assigning tailors:', error);
    res.status(500).json({ error: 'Failed to auto-assign tailors' });
  }
}

export async function getAlterationsByMember(req: Request, res: Response) {
  try {
    const { memberId } = req.params;

    const alterations = await prisma.alterationJob.findMany({
      where: { partyMemberId: Number(memberId) },
      include: {
        party: true,
        partyMember: true,
        customer: true,
        jobParts: {
          include: {
            tasks: true,
            assignedUser: true
          }
        }
      }
    });

    res.json(alterations);
  } catch (error) {
    logger.error('Error getting alterations by member:', error);
    res.status(500).json({ error: 'Failed to get alterations by member' });
  }
}

/**
 * Assign tailor to alteration job part
 */
export async function assignTailorToPart(req: Request, res: Response) {
  try {
    const { partId } = req.params;
    const { tailorId, reason } = req.body;
    const userId = (req as any).user?.id;

    if (!tailorId) {
      return res.status(400).json({ error: 'tailorId is required' });
    }

    // Get current assignment
    const currentPart = await prisma.alterationJobPart.findUnique({
      where: { id: Number(partId) },
      include: { job: true }
    });

    if (!currentPart) {
      return res.status(404).json({ error: 'Alteration job part not found' });
    }

    const oldTailorId = currentPart.assignedTo;

    // Update assignment
    const updatedPart = await prisma.alterationJobPart.update({
      where: { id: Number(partId) },
      data: { assignedTo: Number(tailorId) },
      include: {
        assignedUser: true,
        job: true
      }
    });

    // Log assignment change
    await prisma.assignmentLog.create({
      data: {
        jobId: currentPart.jobId,
        partId: Number(partId),
        oldTailorId,
        newTailorId: Number(tailorId),
        userId,
        method: 'manual',
        reason: reason || 'Manual assignment'
      }
    });

    // Log audit event
    await logChange(
      userId,
      'assign',
      'AlterationJobPart',
      Number(partId),
      {
        oldTailorId,
        newTailorId: tailorId,
        reason
      },
      req
    );

    res.json({
      success: true,
      part: updatedPart,
      message: 'Tailor assigned successfully'
    });

  } catch (error) {
    logger.error('Error assigning tailor to part:', error);
    res.status(500).json({ error: 'Failed to assign tailor' });
  }
}

/**
 * Start work on alteration task
 */
export async function startTask(req: Request, res: Response) {
  try {
    const { taskId } = req.params;
    const { tailorId, notes } = req.body;
    const userId = (req as any).user?.id;

    if (!tailorId) {
      return res.status(400).json({ error: 'tailorId is required' });
    }

    const task = await prisma.alterationTask.findUnique({
      where: { id: Number(taskId) },
      include: { part: { include: { job: true } } }
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Update task
    const updatedTask = await prisma.alterationTask.update({
      where: { id: Number(taskId) },
      data: {
        status: 'IN_PROGRESS',
        startTime: new Date(),
        assignedTo: Number(tailorId)
      },
      include: {
        assignedUser: true,
        part: { include: { job: true } }
      }
    });

    // Log task start
    await prisma.alterationTaskLog.create({
      data: {
        taskId: Number(taskId),
        userId: Number(tailorId),
        action: 'started',
        notes: notes || 'Work started'
      }
    });

    // Update part status if this is the first task started
    const partTasks = await prisma.alterationTask.findMany({
      where: { partId: task.partId }
    });

    const hasStartedTasks = partTasks.some(t => t.status === 'IN_PROGRESS' || t.status === 'COMPLETE');
    if (hasStartedTasks) {
      await prisma.alterationJobPart.update({
        where: { id: task.partId },
        data: { status: 'IN_PROGRESS' }
      });
    }

    res.json({
      success: true,
      task: updatedTask,
      message: 'Task started successfully'
    });

  } catch (error) {
    logger.error('Error starting task:', error);
    res.status(500).json({ error: 'Failed to start task' });
  }
}

/**
 * Finish work on alteration task
 */
export async function finishTask(req: Request, res: Response) {
  try {
    const { taskId } = req.params;
    const { timeSpent, notes, initials } = req.body;
    const userId = (req as any).user?.id;

    const task = await prisma.alterationTask.findUnique({
      where: { id: Number(taskId) },
      include: { part: { include: { job: true } } }
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Update task
    const updatedTask = await prisma.alterationTask.update({
      where: { id: Number(taskId) },
      data: {
        status: 'COMPLETE',
        finishTime: new Date(),
        timeSpent: timeSpent ? Number(timeSpent) : null,
        initials: initials || null
      },
      include: {
        assignedUser: true,
        part: { include: { job: true } }
      }
    });

    // Log task completion
    await prisma.alterationTaskLog.create({
      data: {
        taskId: Number(taskId),
        userId: task.assignedTo || userId,
        action: 'finished',
        notes: notes || 'Work completed'
      }
    });

    // Check if all tasks in part are complete
    const partTasks = await prisma.alterationTask.findMany({
      where: { partId: task.partId }
    });

    const allTasksComplete = partTasks.every(t => t.status === 'COMPLETE');
    if (allTasksComplete) {
      await prisma.alterationJobPart.update({
        where: { id: task.partId },
        data: { status: 'COMPLETE' }
      });
    }

    res.json({
      success: true,
      task: updatedTask,
      message: 'Task completed successfully'
    });

  } catch (error) {
    logger.error('Error finishing task:', error);
    res.status(500).json({ error: 'Failed to finish task' });
  }
}

/**
 * Manually schedule a single alteration job part on a specific date
 * Increments WorkDayPlan counters accordingly
 */
export async function schedulePartManual(req: Request, res: Response) {
  try {
    const { partId } = req.params;
    const { date, lastMinute } = req.body as { date?: string; lastMinute?: boolean };
    if (!date) return res.status(400).json({ error: 'date is required (YYYY-MM-DD)' });

    const targetDay = new Date(`${date}T00:00:00Z`);
    const weekday = targetDay.getUTCDay();
    if (weekday === 4 && !lastMinute) {
      return res.status(400).json({ error: 'Thursday scheduling requires lastMinute=true' });
    }

    const part = await prisma.alterationJobPart.findUnique({
      where: { id: Number(partId) },
      include: { job: true },
    });
    if (!part) return res.status(404).json({ error: 'Part not found' });

    // Create or get WorkDayPlan for the target date
    const day = new Date(Date.UTC(targetDay.getUTCFullYear(), targetDay.getUTCMonth(), targetDay.getUTCDate()));
    let plan = await prisma.workDayPlan.findUnique({ where: { date: day } });
    if (!plan) {
      plan = await prisma.workDayPlan.create({ data: { date: day } });
    }

    // Determine capacity unit
    const isJacketUnit = ['JACKET', 'VEST', 'SHIRT', 'OTHER'].includes(String(part.partType));
    const isPantsUnit = ['PANTS', 'SKIRT'].includes(String(part.partType));

    // If rescheduling, decrement previous day counters
    if (part.scheduledFor && part.workDayId) {
      const prev = await prisma.workDayPlan.findUnique({ where: { id: part.workDayId } });
      if (prev) {
        await prisma.workDayPlan.update({
          where: { id: prev.id },
          data: {
            assignedJackets: prev.assignedJackets - (isJacketUnit ? 1 : 0),
            assignedPants: prev.assignedPants - (isPantsUnit ? 1 : 0),
          },
        });
      }
    }

    // Update part and increment plan counters
    const updatedPart = await prisma.alterationJobPart.update({
      where: { id: Number(partId) },
      data: {
        scheduledFor: day,
        workDay: { connect: { id: plan.id } },
      },
      include: { job: true },
    });

    await prisma.workDayPlan.update({
      where: { id: plan.id },
      data: {
        assignedJackets: plan.assignedJackets + (isJacketUnit ? 1 : 0),
        assignedPants: plan.assignedPants + (isPantsUnit ? 1 : 0),
      },
    });

    return res.json({ success: true, part: updatedPart });
  } catch (error) {
    logger.error('Error manual scheduling part:', error);
    return res.status(500).json({ error: 'Failed to schedule part' });
  }
}

/**
 * Get available tailors for specific task types
 */
export async function getAvailableTailors(req: Request, res: Response) {
  try {
    const { taskType, estimatedTime, preferredDate } = req.query;

    // Get tailors with specific abilities
    const tailors = await prisma.user.findMany({
      where: {
        role: 'tailor'
      },
      include: {
        tailorAbilities: {
          include: {
            taskType: true
          }
        },
        userSchedules: true
      }
    });

    // Filter by task type ability if specified
    const availableTailors = tailors.filter(tailor => {
      if (taskType) {
        const hasAbility = tailor.tailorAbilities?.some(ability => 
          ability.taskType.name.toLowerCase().includes(taskType.toString().toLowerCase())
        );
        if (!hasAbility) return false;
      }

      // TODO: Add availability checking based on userSchedule and estimatedTime
      // This will be enhanced when calendar integration is implemented

      return true;
    });

    res.json({
      success: true,
      tailors: availableTailors.map(tailor => ({
        id: tailor.id,
        name: tailor.name,
        abilities: tailor.tailorAbilities?.map(ability => ability.taskType.name) || [],
        availability: 'Available' // Placeholder for future calendar integration
      }))
    });

  } catch (error) {
    logger.error('Error getting available tailors:', error);
    res.status(500).json({ error: 'Failed to get available tailors' });
  }
}

/**
 * Get alteration job history with detailed tracking
 */
export async function getAlterationJobHistory(req: Request, res: Response) {
  try {
    const { jobId } = req.params;

    const job = await prisma.alterationJob.findUnique({
      where: { id: Number(jobId) },
      include: {
        party: true,
        partyMember: true,
        customer: true,
        tailor: true,
        jobParts: {
          include: {
            tasks: {
              include: {
                assignedUser: true,
                taskLogs: {
                  include: {
                    user: true
                  },
                  orderBy: { timestamp: 'desc' }
                }
              }
            },
            assignedUser: true,
            assignmentLogs: {
              include: {
                user: true
              },
              orderBy: { timestamp: 'desc' }
            }
          }
        },
        assignmentLogs: {
          include: {
            user: true
          },
          orderBy: { timestamp: 'desc' }
        }
      }
    });

    if (!job) {
      return res.status(404).json({ error: 'Alteration job not found' });
    }

    res.json({
      success: true,
      job,
      message: 'Job history retrieved successfully'
    });

  } catch (error) {
    logger.error('Error getting alteration job history:', error);
    res.status(500).json({ error: 'Failed to get job history' });
  }
} 