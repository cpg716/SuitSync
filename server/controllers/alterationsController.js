const prisma = require('../prismaClient');
const { createServiceOrder } = require('../lightspeedClient');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { autoAssignTailorsForJob } = require('../services/autoAssignService');

// Generate unique job number
function generateJobNumber() {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${timestamp}-${random}`;
}

// Generate secure QR code
function generateQRCode(prefix = 'ALT') {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(8).toString('hex').toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

// Default workflow steps
const DEFAULT_WORKFLOW_STEPS = [
  { stepName: 'Measured', stepType: 'MEASURED', sortOrder: 1 },
  { stepName: 'Suit Ordered', stepType: 'SUIT_ORDERED', sortOrder: 2 },
  { stepName: 'Suit Arrived', stepType: 'SUIT_ARRIVED', sortOrder: 3 },
  { stepName: 'Alterations Marked', stepType: 'ALTERATIONS_MARKED', sortOrder: 4 },
  { stepName: 'Complete', stepType: 'COMPLETE', sortOrder: 5 },
  { stepName: 'QC Checked', stepType: 'QC_CHECKED', sortOrder: 6 },
  { stepName: 'Ready for Pickup', stepType: 'READY_FOR_PICKUP', sortOrder: 7 },
  { stepName: 'Picked Up', stepType: 'PICKED_UP', sortOrder: 8 },
];

exports.listAlterations = async (req, res) => {
  try {
    const jobs = await prisma.alterationJob.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        tailor: true,
        jobParts: true,
        customer: true, // For walk-ins
        partyMember: {
          include: {
            party: {
              include: {
                customer: true, // The customer who owns the party
              }
            },
          }
        },
      }
    });
    res.json(jobs);
  } catch (err) {
    console.error('Error listing alterations:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.createAlteration = async (req, res) => {
  const {
    saleLineItemId, // Required: The line item from a sale that is being altered
    notes,
    status,
    tailorId,
    partyMemberId, // Optional, for internal linking
  } = req.body;

  if (!saleLineItemId) {
    return res.status(400).json({ error: 'A saleLineItemId is required to create an alteration service order.' });
  }

  try {
    // Step 1: We need the Lightspeed Customer ID. We can derive this from the sale or party member.
    // For this example, we assume the frontend can provide the lightspeed_customer_id
    // A more robust implementation would fetch the sale, get the customer_id from there.
    // For now, let's assume we can get it from the party member.
    const member = await prisma.partyMember.findUnique({
      where: { id: partyMemberId },
      include: { party: { include: { customer: true } } },
    });

    const lightspeedCustomerId = member?.party?.customer?.lightspeedId;

    if (!lightspeedCustomerId) {
      return res.status(400).json({ error: 'Could not determine the Lightspeed Customer ID for this alteration.' });
    }

    // Step 2: Construct the Service Order payload for Lightspeed
    const serviceOrderPayload = {
      customer_id: lightspeedCustomerId,
      line_item_id: saleLineItemId,
      status: 'open', // Service orders have statuses like 'open', 'in_progress', 'completed'
      notes: notes || 'Standard alteration job.',
      // You can add more details like assigned user, due dates etc. if the API supports it
    };

    // Step 3: Create the Service Order in Lightspeed
    const { data: newServiceOrderResponse } = await createServiceOrder(req.session, serviceOrderPayload);
    const lightspeedServiceOrderId = newServiceOrderResponse.service_order.id;

    logger.info(`Created Lightspeed Service Order ${lightspeedServiceOrderId} for Line Item ${saleLineItemId}`);

    // Step 4: Create the AlterationJob in the local database
    const job = await prisma.alterationJob.create({
      data: {
        lightspeedServiceOrderId: String(lightspeedServiceOrderId),
        partyMemberId,
        notes,
        status: status || 'Pending',
        tailorId,
        // The other IDs like partyId and customerId can be linked via the partyMemberId relation
        partyId: member?.partyId,
        customerId: member?.party?.customer?.id,
      },
      include: {
        partyMember: { include: { party: true } },
        tailor: true,
      }
    });

    res.status(201).json(job);
  } catch (err) {
    logger.error('Error creating alteration service order:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to create alteration job.' });
  }
};

exports.getAlterationsByMember = async (req, res) => {
  try {
    const memberId = parseInt(req.params.memberId);
    if (!memberId) return res.status(400).json({ error: 'Invalid member id' });
    const jobs = await prisma.alterationJob.findMany({
      where: { partyMemberId: memberId },
      include: { party: true, customer: true, tailor: true, jobParts: true }
    });
    res.json(jobs);
  } catch (err) {
    console.error('Error fetching alterations by member:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get single alteration
exports.getAlteration = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
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
  } catch (err) {
    console.error('Error fetching alteration:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update alteration
exports.updateAlteration = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid alteration id' });
    
    const { notes, status, tailorId, dueDate, rushOrder } = req.body;
    
    const job = await prisma.alterationJob.update({
      where: { id },
      data: {
        notes,
        status,
        tailorId: tailorId ? parseInt(tailorId) : undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        rushOrder
      },
      include: {
        customer: true,
        party: { include: { customer: true } },
        partyMember: true,
        tailor: true,
        jobParts: true
      }
    });
    
    res.json(job);
  } catch (err) {
    console.error('Error updating alteration:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete alteration
exports.deleteAlteration = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid alteration id' });
    
    await prisma.alterationJob.delete({
      where: { id }
    });
    
    res.json({ message: 'Alteration deleted successfully' });
  } catch (err) {
    console.error('Error deleting alteration:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create alteration job with parts and tasks
exports.createAlterationJob = async (req, res) => {
  try {
    const {
      customerId,
      partyId,
      partyMemberId,
      notes,
      dueDate,
      rushOrder = false,
      orderStatus = 'ALTERATION_ONLY',
      parts = [], // Array of { partType, partName, tasks: [{ taskName, taskType, measurements }] }
    } = req.body;

    // Validate required fields
    if (!customerId && !partyId) {
      return res.status(400).json({ error: 'Either customerId or partyId is required' });
    }

    // Generate job number and QR code
    const jobNumber = generateJobNumber();
    const jobQRCode = generateQRCode('JOB');

    // Create the main alteration job
    const alterationJob = await prisma.alterationJob.create({
      data: {
        jobNumber,
        qrCode: jobQRCode,
        customerId: customerId ? parseInt(customerId) : undefined,
        partyId: partyId ? parseInt(partyId) : undefined,
        partyMemberId: partyMemberId ? parseInt(partyMemberId) : undefined,
        notes,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        rushOrder,
        orderStatus,
        status: 'NOT_STARTED',
        receivedDate: new Date(),
        // Create workflow steps
        workflowSteps: {
          create: DEFAULT_WORKFLOW_STEPS.map(step => ({
            ...step,
            completed: step.stepType === 'MEASURED' && orderStatus === 'ALTERATION_ONLY',
          }))
        },
        // Create job parts
        jobParts: {
          create: parts.map(part => ({
            partName: part.partName,
            partType: part.partType,
            qrCode: generateQRCode('PART'),
            priority: part.priority || 'NORMAL',
            estimatedTime: part.estimatedTime,
            notes: part.notes,
            // Create tasks for this part
            tasks: {
              create: (part.tasks || []).map(task => ({
                taskName: task.taskName,
                taskType: task.taskType,
                measurements: task.measurements,
                notes: task.notes,
              }))
            }
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
  } catch (error) {
    console.error('Error creating alteration job:', error);
    res.status(500).json({ error: 'Failed to create alteration job' });
  }
};

// Get all alteration jobs with filtering
exports.getAlterationJobs = async (req, res) => {
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
    } = req.query;

    const where = {};
    
    if (status) where.status = status;
    if (customerId) where.customerId = parseInt(customerId);
    if (partyId) where.partyId = parseInt(partyId);
    if (tailorId) where.tailorId = parseInt(tailorId);
    
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

    const offset = (parseInt(page) - 1) * parseInt(limit);

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
        take: parseInt(limit)
      }),
      prisma.alterationJob.count({ where })
    ]);

    res.json({
      jobs,
      pagination: {
        total,
        pages: Math.ceil(total / parseInt(limit)),
        current: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching alteration jobs:', error);
    res.status(500).json({ error: 'Failed to fetch alteration jobs' });
  }
};

// Get single alteration job by ID
exports.getAlterationJob = async (req, res) => {
  try {
    const { id } = req.params;

    const job = await prisma.alterationJob.findUnique({
      where: { id: parseInt(id) },
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
  } catch (error) {
    console.error('Error fetching alteration job:', error);
    res.status(500).json({ error: 'Failed to fetch alteration job' });
  }
};

// Update alteration job
exports.updateAlterationJob = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove fields that shouldn't be directly updated
    delete updates.id;
    delete updates.jobNumber;
    delete updates.qrCode;
    delete updates.createdAt;

    const job = await prisma.alterationJob.update({
      where: { id: parseInt(id) },
      data: {
        ...updates,
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
  } catch (error) {
    console.error('Error updating alteration job:', error);
    res.status(500).json({ error: 'Failed to update alteration job' });
  }
};

// Delete alteration job
exports.deleteAlterationJob = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.alterationJob.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Alteration job deleted successfully' });
  } catch (error) {
    console.error('Error deleting alteration job:', error);
    res.status(500).json({ error: 'Failed to delete alteration job' });
  }
};

// QR Code scanning endpoint
exports.scanQRCode = async (req, res) => {
  try {
    const { qrCode } = req.params;
    const { scanType, location, notes } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    // Find the job part by QR code
    const jobPart = await prisma.alterationJobPart.findUnique({
      where: { qrCode },
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

    if (!jobPart) {
      return res.status(404).json({ error: 'Invalid QR code' });
    }

    let result = 'Success';
    let newStatus = jobPart.status;

    // Handle different scan types
    switch (scanType) {
      case 'START_WORK':
        if (jobPart.status === 'NOT_STARTED') {
          newStatus = 'IN_PROGRESS';
          // Update part status and assign user if not assigned
          await prisma.alterationJobPart.update({
            where: { id: jobPart.id },
            data: {
              status: newStatus,
              assignedTo: jobPart.assignedTo || userId
            }
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
            data: { status: newStatus }
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
            data: { status: newStatus }
          });
        } else {
          result = 'Part not ready for pickup';
        }
        break;

      case 'STATUS_CHECK':
        // Just log the scan, no status change
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
        metadata: { notes }
      }
    });

    // Check if all parts are complete to update job status
    const allParts = await prisma.alterationJobPart.findMany({
      where: { jobId: jobPart.jobId }
    });

    const allComplete = allParts.every(part => part.status === 'COMPLETE' || part.status === 'PICKED_UP');
    const allPickedUp = allParts.every(part => part.status === 'PICKED_UP');

    if (allPickedUp) {
      await prisma.alterationJob.update({
        where: { id: jobPart.jobId },
        data: { status: 'PICKED_UP' }
      });
    } else if (allComplete) {
      await prisma.alterationJob.update({
        where: { id: jobPart.jobId },
        data: { status: 'COMPLETE' }
      });
    }

    // Return updated part info
    const updatedPart = await prisma.alterationJobPart.findUnique({
      where: { id: jobPart.id },
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

    res.json({
      success: true,
      result,
      part: updatedPart,
      scanType,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Error scanning QR code:', error);
    res.status(500).json({ error: 'Failed to process QR scan' });
  }
};

// Get QR scan logs
exports.getScanLogs = async (req, res) => {
  try {
    const { qrCode, partId, userId, limit = 50 } = req.query;

    const where = {};
    if (qrCode) where.qrCode = qrCode;
    if (partId) where.partId = parseInt(partId);
    if (userId) where.scannedBy = parseInt(userId);

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
      take: parseInt(limit)
    });

    res.json(logs);
  } catch (error) {
    console.error('Error fetching scan logs:', error);
    res.status(500).json({ error: 'Failed to fetch scan logs' });
  }
};

// Dashboard analytics
exports.getDashboardStats = async (req, res) => {
  try {
    const { tailorId, dateFrom, dateTo } = req.query;

    const dateFilter = {};
    if (dateFrom) dateFilter.gte = new Date(dateFrom);
    if (dateTo) dateFilter.lte = new Date(dateTo);

    const where = {};
    if (tailorId) where.tailorId = parseInt(tailorId);
    if (Object.keys(dateFilter).length > 0) where.createdAt = dateFilter;

    const [
      totalJobs,
      inProgressJobs,
      completedJobs,
      overdueJobs,
      partsByStatus,
      recentActivity
    ] = await Promise.all([
      // Total jobs
      prisma.alterationJob.count({ where }),
      
      // In progress jobs
      prisma.alterationJob.count({
        where: { ...where, status: 'IN_PROGRESS' }
      }),
      
      // Completed jobs
      prisma.alterationJob.count({
        where: { ...where, status: 'COMPLETE' }
      }),
      
      // Overdue jobs
      prisma.alterationJob.count({
        where: {
          ...where,
          dueDate: { lt: new Date() },
          status: { notIn: ['COMPLETE', 'PICKED_UP'] }
        }
      }),
      
      // Parts by status
      prisma.alterationJobPart.groupBy({
        by: ['status'],
        _count: { status: true },
        where: tailorId ? { assignedTo: parseInt(tailorId) } : {}
      }),
      
      // Recent QR scans
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
      partsByStatus: partsByStatus.reduce((acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {}),
      recentActivity
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};

// Update workflow step
exports.updateWorkflowStep = async (req, res) => {
  try {
    const { jobId, stepId } = req.params;
    const { completed, notes } = req.body;
    const userId = req.user?.id;

    const step = await prisma.alterationWorkflowStep.update({
      where: { id: parseInt(stepId) },
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
  } catch (error) {
    console.error('Error updating workflow step:', error);
    res.status(500).json({ error: 'Failed to update workflow step' });
  }
};

exports.autoAssignTailors = async (req, res) => {
  try {
    const jobId = req.params.id;
    const { assignments } = req.body || {};
    if (Array.isArray(assignments) && assignments.length > 0) {
      // Manual override: apply assignments directly
      const updates = assignments.map(a =>
        prisma.alterationJobPart.update({
          where: { id: a.partId },
          data: { assignedTailorId: a.assignedTailorId || null },
        })
      );
      await Promise.all(updates);
      res.json({ success: true, assignments });
      return;
    }
    // Otherwise, run auto-assign logic
    const result = await autoAssignTailorsForJob(jobId);
    res.json({ success: true, assignments: result });
  } catch (err) {
    logger.error('Error in auto-assign:', err.message);
    res.status(500).json({ error: 'Failed to auto-assign tailors', details: err.message });
  }
}; 