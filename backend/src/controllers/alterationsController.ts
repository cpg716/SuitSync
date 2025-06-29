import { Request, Response } from 'express';
import { PrismaClient, AlterationJobStatus, OrderStatus, PartPriority, GarmentPartType, WorkflowStepType } from '@prisma/client';
import { createServiceOrder } from '../lightspeedClient'; // TODO: migrate this as well
import logger from '../utils/logger'; // TODO: migrate this as well
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { autoAssignTailorsForJob } from '../services/autoAssignService';
import { verifyAndGetCustomField, createOrUpdateCustomField, initialize as initializeWorkflow } from '../services/workflowService';
import { processWebhook } from '../services/webhookService';
import { withAccelerate } from '@prisma/extension-accelerate';

const prisma = new PrismaClient().$extends(withAccelerate());

type AlterationJobPartInput = {
  partName: string;
  partType: string;
  priority?: string;
  estimatedTime?: number;
  notes?: string;
  tasks?: Array<{
    taskName: string;
    taskType: string;
    measurements?: any;
    notes?: string;
  }>;
};

function generateJobNumber(): string {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${timestamp}-${random}`;
}

function generateQRCode(prefix = 'ALT'): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(8).toString('hex').toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

const DEFAULT_WORKFLOW_STEPS = [
  { stepName: 'Measured', stepType: WorkflowStepType.MEASURED, sortOrder: 1 },
  { stepName: 'Suit Ordered', stepType: WorkflowStepType.SUIT_ORDERED, sortOrder: 2 },
  { stepName: 'Suit Arrived', stepType: WorkflowStepType.SUIT_ARRIVED, sortOrder: 3 },
  { stepName: 'Alterations Marked', stepType: WorkflowStepType.ALTERATIONS_MARKED, sortOrder: 4 },
  { stepName: 'Complete', stepType: WorkflowStepType.COMPLETE, sortOrder: 5 },
  { stepName: 'QC Checked', stepType: WorkflowStepType.QC_CHECKED, sortOrder: 6 },
  { stepName: 'Ready for Pickup', stepType: WorkflowStepType.READY_FOR_PICKUP, sortOrder: 7 },
  { stepName: 'Picked Up', stepType: WorkflowStepType.PICKED_UP, sortOrder: 8 },
];

export const listAlterations = async (req: any, res: any) => {
  try {
    const jobs = await prisma.alterationJob.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        tailor: true,
        jobParts: true,
        customer: true,
        partyMember: {
          include: {
            party: {
              include: {
                customer: true,
              }
            },
          }
        },
      }
    });
    res.json(jobs);
  } catch (err: any) {
    console.error('Error listing alterations:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createAlteration = async (req: Request, res: Response) => {
  const {
    saleLineItemId,
    notes,
    status,
    tailorId,
    partyMemberId,
  } = req.body;

  if (!saleLineItemId) {
    return res.status(400).json({ error: 'A saleLineItemId is required to create an alteration service order.' });
  }

  try {
    const member = await prisma.partyMember.findUnique({
      where: { id: Number(partyMemberId) },
      include: { party: { include: { customer: true } } },
    });
    const lightspeedCustomerId = member?.party?.customer?.lightspeedId;
    if (!lightspeedCustomerId) {
      return res.status(400).json({ error: 'Could not determine the Lightspeed Customer ID for this alteration.' });
    }
    const serviceOrderPayload = {
      customer_id: lightspeedCustomerId,
      line_item_id: saleLineItemId,
      status: 'open',
      notes: notes || 'Standard alteration job.',
    };
    const { data: newServiceOrderResponse } = await createServiceOrder(req.session, serviceOrderPayload);
    if (!newServiceOrderResponse) throw new Error('No response from Lightspeed');
    const lightspeedServiceOrderId = newServiceOrderResponse.service_order.id;
    logger.info(`Created Lightspeed Service Order ${lightspeedServiceOrderId} for Line Item ${saleLineItemId}`);
    const job = await prisma.alterationJob.create({
      data: {
        jobNumber: uuidv4(),
        qrCode: uuidv4(),
        lightspeedServiceOrderId: String(lightspeedServiceOrderId),
        partyMemberId: Number(partyMemberId),
        notes,
        status: AlterationJobStatus.NOT_STARTED,
        tailorId: Number(tailorId),
        partyId: member?.partyId,
        customerId: member?.party?.customer?.id,
      },
      include: {
        partyMember: { include: { party: true } },
        tailor: true,
      }
    });
    res.status(201).json(job);
  } catch (err: any) {
    logger.error('Error creating alteration service order:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to create alteration job.' });
  }
};

export const getAlterationsByMember = async (req: Request, res: Response) => {
  try {
    const memberId = Number(req.params.memberId);
    if (!memberId) return res.status(400).json({ error: 'Invalid member id' });
    const jobs = await prisma.alterationJob.findMany({
      where: { partyMemberId: memberId },
      include: { party: true, customer: true, tailor: true, jobParts: true }
    });
    res.json(jobs);
  } catch (err: any) {
    console.error('Error fetching alterations by member:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAlteration = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid alteration id' });
    const job = await prisma.alterationJob.findUnique({
      where: { id },
      include: {
        customer: true,
        party: { include: { customer: true } },
        partyMember: true,
        tailor: true,
        jobParts: {
          include: {
            tasks: { include: { assignedUser: true } },
            assignedUser: true
          }
        },
        workflowSteps: { orderBy: { sortOrder: 'asc' } }
      }
    });
    if (!job) {
      return res.status(404).json({ error: 'Alteration not found' });
    }
    res.json(job);
  } catch (err: any) {
    console.error('Error fetching alteration:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateAlteration = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid alteration id' });
    const { notes, status, tailorId, dueDate, rushOrder } = req.body;
    const job = await prisma.alterationJob.update({
      where: { id },
      data: {
        notes,
        status: status ? (typeof status === 'string' ? AlterationJobStatus[status as keyof typeof AlterationJobStatus] : status) : undefined,
        tailorId: tailorId ? Number(tailorId) : undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        rushOrder
      },
      include: {
        customer: true,
        party: { include: { customer: true } },
        partyMember: true,
        tailor: true,
        jobParts: true,
      }
    });
    res.json(job);
  } catch (err: any) {
    console.error('Error updating alteration:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteAlteration = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid alteration id' });
    await prisma.alterationJob.delete({ where: { id } });
    res.json({ message: 'Alteration deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting alteration:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createAlterationJob = async (req: Request, res: Response) => {
  try {
    const {
      customerId,
      partyId,
      partyMemberId,
      notes,
      dueDate,
      rushOrder = false,
      orderStatus = OrderStatus.ALTERATION_ONLY,
      parts = [],
    } = req.body;

    if (!customerId && !partyId) {
      return res.status(400).json({ error: 'Either customerId or partyId is required' });
    }

    const jobNumber = generateJobNumber();
    const jobQRCode = generateQRCode('JOB');

    const alterationJob = await prisma.alterationJob.create({
      data: {
        jobNumber,
        qrCode: jobQRCode,
        customerId: customerId ? Number(customerId) : undefined,
        partyId: partyId ? Number(partyId) : undefined,
        partyMemberId: partyMemberId ? Number(partyMemberId) : undefined,
        notes,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        rushOrder,
        orderStatus: typeof orderStatus === 'string' ? OrderStatus[orderStatus as keyof typeof OrderStatus] : orderStatus,
        status: AlterationJobStatus.NOT_STARTED,
        receivedDate: new Date(),
        workflowSteps: {
          create: DEFAULT_WORKFLOW_STEPS.map(step => ({
            ...step,
            completed: step.stepType === 'MEASURED' && (typeof orderStatus === 'string' ? orderStatus === 'ALTERATION_ONLY' : orderStatus === OrderStatus.ALTERATION_ONLY),
          }))
        },
        jobParts: {
          create: parts.map((part: AlterationJobPartInput) => ({
            partName: part.partName,
            partType: typeof part.partType === 'string' ? GarmentPartType[part.partType as keyof typeof GarmentPartType] : part.partType,
            qrCode: generateQRCode('PART'),
            priority: part.priority ? (PartPriority[part.priority as keyof typeof PartPriority] ?? PartPriority.NORMAL) : PartPriority.NORMAL,
            estimatedTime: part.estimatedTime,
            notes: part.notes,
            tasks: {
              create: (part.tasks || []).map((task: any) => ({
                taskName: task.taskName,
                taskType: task.taskType,
                measurements: task.measurements,
                notes: task.notes,
              }))
            },
            status: AlterationJobStatus.NOT_STARTED,
          }))
        }
      },
      include: {
        customer: true,
        party: {
          include: {
            customer: true
          }
        },
        partyMember: true,
        jobParts: {
          include: {
            tasks: true,
            assignedUser: true
          }
        },
        workflowSteps: {
          orderBy: { sortOrder: 'asc' }
        }
      }
    });

    res.status(201).json(alterationJob);
  } catch (error: any) {
    console.error('Error creating alteration job:', error);
    res.status(500).json({ error: 'Failed to create alteration job' });
  }
};

export const getAlterationJobs = async (req: Request, res: Response) => {
  try {
    const {
      status,
      customerId,
      partyId,
      tailorId,
      partStatus,
      search,
      page = 1,
      limit = 50,
      orderBy = 'createdAt',
      orderDir = 'desc'
    } = req.query as any;

    const where: any = {};
    if (status) where.status = status;
    if (customerId) where.customerId = Number(customerId);
    if (partyId) where.partyId = Number(partyId);
    if (tailorId) where.tailorId = Number(tailorId);
    if (search) {
      where.OR = [
        { jobNumber: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { party: { name: { contains: search, mode: 'insensitive' } } }
      ];
    }
    if (partStatus) {
      where.jobParts = {
        some: {
          status: partStatus
        }
      };
    }
    const offset = (Number(page) - 1) * Number(limit);
    const [jobs, total] = await Promise.all([
      prisma.alterationJob.findMany({
        where,
        include: {
          customer: true,
          party: {
            include: {
              customer: true
            }
          },
          partyMember: true,
          tailor: true,
          jobParts: {
            include: {
              assignedUser: true,
              tasks: {
                include: {
                  assignedUser: true
                }
              }
            }
          },
          workflowSteps: {
            orderBy: { sortOrder: 'asc' }
          }
        },
        orderBy: { [orderBy]: orderDir },
        skip: offset,
        take: Number(limit)
      }),
      prisma.alterationJob.count({ where })
    ]);
    res.json({
      jobs,
      pagination: {
        total,
        pages: Math.ceil(total / Number(limit)),
        current: Number(page),
        limit: Number(limit)
      }
    });
  } catch (error: any) {
    console.error('Error fetching alteration jobs:', error);
    res.status(500).json({ error: 'Failed to fetch alteration jobs' });
  }
};

export const getAlterationJob = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const job = await prisma.alterationJob.findUnique({
      where: { id: Number(id) },
      include: {
        customer: true,
        party: {
          include: {
            customer: true
          }
        },
        partyMember: true,
        tailor: true,
        jobParts: {
          include: {
            assignedUser: true,
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
            scanLogs: {
              include: {
                user: true
              },
              orderBy: { timestamp: 'desc' }
            }
          }
        },
        workflowSteps: {
          include: {
            completedByUser: true
          },
          orderBy: { sortOrder: 'asc' }
        }
      }
    });
    if (!job) {
      return res.status(404).json({ error: 'Alteration job not found' });
    }
    res.json(job);
  } catch (error: any) {
    console.error('Error fetching alteration job:', error);
    res.status(500).json({ error: 'Failed to fetch alteration job' });
  }
};

export const updateAlterationJob = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    delete updates.id;
    delete updates.jobNumber;
    delete updates.qrCode;
    delete updates.createdAt;
    const job = await prisma.alterationJob.update({
      where: { id: Number(id) },
      data: {
        ...updates,
        status: updates.status ? (typeof updates.status === 'string' ? AlterationJobStatus[updates.status as keyof typeof AlterationJobStatus] : updates.status) : undefined,
        orderStatus: updates.orderStatus ? (typeof updates.orderStatus === 'string' ? OrderStatus[updates.orderStatus as keyof typeof OrderStatus] : updates.orderStatus) : undefined,
        dueDate: updates.dueDate ? new Date(updates.dueDate) : undefined,
      },
      include: {
        customer: true,
        party: true,
        partyMember: true,
        tailor: true,
        jobParts: {
          include: {
            assignedUser: true,
            tasks: true
          }
        },
        workflowSteps: {
          orderBy: { sortOrder: 'asc' }
        }
      }
    });
    res.json(job);
  } catch (error: any) {
    console.error('Error updating alteration job:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteAlterationJob = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.alterationJob.delete({ where: { id: Number(id) } });
    res.json({ message: 'Alteration job deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting alteration job:', error);
    res.status(500).json({ error: 'Failed to delete alteration job' });
  }
};

// Helper to bypass TS2345 for alterationJobPart lookup
function findAlterationJobPartById(id: any, prisma: any) {
  return prisma.alterationJobPart.findUnique({
    where: { id: id as any },
    include: {
      job: {
        include: {
          customer: true,
          party: true
        }
      },
      tasks: true,
      assignedUser: true
    }
  });
}

export const scanQRCode = async (req: Request, res: Response) => {
  try {
    const { qrCode } = req.params;
    const { scanType, location, notes } = req.body;
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    // Use findUniqueOrThrow so jobPart is non-null and typed correctly
    const jobPart = await prisma.alterationJobPart.findUniqueOrThrow({
      where: { qrCode },
      include: {
        job: {
          include: {
            customer: true,
            party: true,
          },
        },
        tasks: true,
        assignedUser: true,
      },
    });

    let result = 'Success';
    let newStatus = jobPart.status;

    switch (scanType) {
      case 'START_WORK':
        if (jobPart.status === 'NOT_STARTED') {
          newStatus = 'IN_PROGRESS';
          await prisma.alterationJobPart.update({
            where: { id: jobPart.id },
            data: {
              status: newStatus,
              assignedTo: jobPart.assignedTo ?? userId,
            },
          });
        } else {
          result = 'Work already started';
        }
        break;

      case 'FINISH_WORK':
        if (jobPart.status === 'IN_PROGRESS') {
          newStatus = 'COMPLETE';
          await prisma.alterationJobPart.update({
            where: { id: jobPart.id },
            data: { status: newStatus },
          });
        } else {
          result = 'Work not in progress';
        }
        break;

      case 'PICKUP':
        if (jobPart.status === 'COMPLETE') {
          newStatus = 'PICKED_UP';
          await prisma.alterationJobPart.update({
            where: { id: jobPart.id },
            data: { status: newStatus },
          });
        } else {
          result = 'Part not ready for pickup';
        }
        break;

      case 'STATUS_CHECK':
        // no updates
        break;

      default:
        return res.status(400).json({ error: 'Invalid scan type' });
    }

    // Log the scan
    await prisma.qRScanLog.create({
      data: {
        qrCode,
        partId: jobPart.id,
        scannedBy: userId,
        scanType,
        location,
        result,
        metadata: { notes },
      },
    });

    // Update overall job status if needed
    const allParts = await prisma.alterationJobPart.findMany({
      where: { jobId: jobPart.jobId },
    });
    const allComplete = allParts.every((p: { status: string }) => p.status === 'COMPLETE' || p.status === 'PICKED_UP');
    const allPickedUp = allParts.every((p: { status: string }) => p.status === 'PICKED_UP');

    if (allPickedUp) {
      await prisma.alterationJob.update({
        where: { id: jobPart.jobId },
        data: { status: 'PICKED_UP' },
      });
    } else if (allComplete) {
      await prisma.alterationJob.update({
        where: { id: jobPart.jobId },
        data: { status: 'COMPLETE' },
      });
    }

    res.json({ result });
  } catch (error: any) {
    console.error('Error scanning QR code:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Invalid QR code' });
    }
    res.status(500).json({ error: 'Failed to process QR scan' });
  }
};

export const getScanLogs = async (req: Request, res: Response) => {
  try {
    const { qrCode, partId, userId, limit = 50 } = req.query as any;
    const where: any = {};
    if (qrCode) where.qrCode = qrCode;
    if (partId) where.partId = Number(partId);
    if (userId) where.scannedBy = Number(userId);
    const logs = await prisma.qRScanLog.findMany({
      where,
      include: {
        user: true,
        part: {
          include: {
            job: true
          }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: Number(limit)
    });
    res.json(logs);
  } catch (error: any) {
    console.error('Error fetching scan logs:', error);
    res.status(500).json({ error: 'Failed to fetch scan logs' });
  }
};

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const { tailorId, dateFrom, dateTo } = req.query as any;
    const dateFilter: any = {};
    if (dateFrom) dateFilter.gte = new Date(dateFrom);
    if (dateTo) dateFilter.lte = new Date(dateTo);
    const where: any = {};
    if (tailorId) where.tailorId = Number(tailorId);
    if (Object.keys(dateFilter).length > 0) where.createdAt = dateFilter;
    const [
      totalJobs,
      inProgressJobs,
      completedJobs,
      overdueJobs,
      partsByStatus,
      recentActivity
    ] = await Promise.all([
      prisma.alterationJob.count({ where }),
      prisma.alterationJob.count({ where: { ...where, status: 'IN_PROGRESS' } }),
      prisma.alterationJob.count({ where: { ...where, status: 'COMPLETE' } }),
      prisma.alterationJob.count({
        where: {
          ...where,
          dueDate: { lt: new Date() },
          status: { notIn: ['COMPLETE', 'PICKED_UP'] }
        }
      }),
      prisma.alterationJobPart.groupBy({
        by: ['status'],
        _count: { status: true },
        where: tailorId ? { assignedTo: Number(tailorId) } : {}
      }),
      prisma.qRScanLog.findMany({
        take: 10,
        orderBy: { timestamp: 'desc' },
        include: {
          user: true,
          part: {
            include: {
              job: {
                include: {
                  customer: true,
                  party: true
                }
              }
            }
          }
        }
      })
    ]);
    res.json({
      summary: {
        totalJobs,
        inProgressJobs,
        completedJobs,
        overdueJobs
      },
      partsByStatus: partsByStatus.reduce((acc: any, item: any) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {}),
      recentActivity
    });
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};

export const updateWorkflowStep = async (req: Request, res: Response) => {
  try {
    const { jobId, stepId } = req.params;
    const { completed, notes } = req.body;
    const userId = (req as any).user?.id;
    const step = await prisma.alterationWorkflowStep.update({
      where: { id: Number(stepId) },
      data: {
        completed,
        completedAt: completed ? new Date() : null,
        completedBy: completed ? userId : null,
        notes
      },
      include: {
        completedByUser: true
      }
    });
    res.json(step);
  } catch (error: any) {
    console.error('Error updating workflow step:', error);
    res.status(500).json({ error: 'Failed to update workflow step' });
  }
};

export const autoAssignTailors = async (req: Request, res: Response) => {
  try {
    const jobId = req.params.id;
    const { assignments } = req.body || {};
    if (Array.isArray(assignments) && assignments.length > 0) {
      const updates = assignments.map((a: any) =>
        prisma.alterationJobPart.update({
          where: { id: Number(a.partId) },
          data: { assignedTo: a.assignedTailorId ? Number(a.assignedTailorId) : null },
        })
      );
      await Promise.all(updates);
      res.json({ success: true, assignments });
      return;
    }
    const result = await autoAssignTailorsForJob(Number(jobId));
    res.json({ success: true, assignments: result });
  } catch (err: any) {
    logger.error('Error in auto-assign:', err.message);
    res.status(500).json({ error: 'Failed to auto-assign tailors', details: err.message });
  }
};

// ...
// The rest of the functions (createAlteration, getAlterationsByMember, getAlteration, updateAlteration, deleteAlteration, createAlterationJob, getAlterationJobs, getAlterationJob, updateAlterationJob, deleteAlterationJob, scanQRCode, getScanLogs, getDashboardStats, updateWorkflowStep, autoAssignTailors) should be migrated in the same style, using async/await, type annotations, and ES module exports.
// ... 