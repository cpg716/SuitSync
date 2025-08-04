import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

const prisma = new PrismaClient().$extends(withAccelerate());

function generateZPLTag(job: any): string {
  const dueDate = job.scheduledDateTime ? new Date(job.scheduledDateTime).toLocaleDateString() : '';
  return `^XA
^FO50,50^A0N,40,40^FDAlteration Tag^FS
^FO50,100^A0N,30,30^FDJob: ${job.id}^FS
^FO50,140^A0N,30,30^FDCustomer: ${job.customerName || ''}^FS
^FO50,180^A0N,30,30^FDGarment: ${job.itemType || ''}^FS
^FO50,220^A0N,30,30^FDDue: ${dueDate}^FS
^FO50,260^A0N,30,30^FDTailor: ${job.tailorName || ''}^FS
^XZ`;
}

export const printTag = async (req: Request, res: Response): Promise<void> => {
  const { jobId, format } = req.body;
  if (!jobId) {
    res.status(400).json({ error: 'Missing jobId' });
    return;
  }
  try {
    const job = await prisma.alterationJob.findUnique({
      where: { id: Number(jobId) },
      include: {
        party: { include: { customer: true } },
        tailor: true,
      },
    });
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    const jobData = {
      id: job.id,
      customerName: job.party?.customer?.name || '',
      itemType: (job as any).itemType || '', // fallback for legacy
      scheduledDateTime: (job as any).scheduledDateTime,
      tailorName: job.tailor?.name || '',
    };
    if (format === 'zpl') {
      const zpl = generateZPLTag(jobData);
      res.type('text/plain').send(zpl);
    } else {
      res.status(400).json({ error: 'Only ZPL format is supported in this endpoint.' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate tag.' });
  }
};

/**
 * Print alterations ticket to local printer
 */
export const printAlterationsTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const ticketData = req.body;
    const { printType = 'all' } = req.body; // 'all' or 'sections'
    
    if (!ticketData) {
      res.status(400).json({ error: 'Missing ticket data' });
      return;
    }

    let receiptText;
    if (printType === 'all') {
      // Print complete ticket with all sections
      receiptText = formatCompleteAlterationsTicket(ticketData);
    } else {
      // Print separate sections (existing functionality)
      receiptText = formatAlterationsTicketForReceipt(ticketData);
    }
    
    // Send to local printer
    const printResult = await sendToLocalPrinter(receiptText);
    
    if (printResult.success) {
      res.json({ 
        success: true, 
        message: `Ticket sent to local printer successfully (${printType})`,
        printData: receiptText
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to print to local printer',
        details: printResult.error 
      });
    }
    
  } catch (error) {
    console.error('Error printing alterations ticket:', error);
    res.status(500).json({ error: 'Failed to print alterations ticket' });
  }
};

/**
 * Format alterations ticket data for receipt printer (separate sections with cuts)
 */
export function formatAlterationsTicketForReceipt(ticketData: any): string {
  const {
    jobNumber,
    partyName,
    memberName,
    memberRole,
    eventDate,
    dueDate,
    parts
  } = ticketData;

  let receipt = '';
  
  // Print separate ticket for each part
  parts.forEach((part: any, index: number) => {
    // Compact header
    receipt += `${part.partName.toUpperCase()}\n`;
    receipt += `${memberName} - ${partyName || 'No Party'}\n`;
    receipt += `Job: ${jobNumber}\n`;
    
    // Add due date or event date
    if (dueDate) {
      receipt += `Due: ${new Date(dueDate).toLocaleDateString()}\n`;
    } else if (eventDate) {
      receipt += `Event: ${new Date(eventDate).toLocaleDateString()}\n`;
    }
    
    receipt += '─'.repeat(32) + '\n';
    
    // Group tasks by type
    const taskGroups = {
      alteration: part.tasks?.filter((task: any) => task.taskType === 'alteration' || task.taskType === 'ALTERATION') || [],
      button_work: part.tasks?.filter((task: any) => task.taskType === 'button_work' || task.taskType === 'BUTTON_WORK') || [],
      measurement: part.tasks?.filter((task: any) => task.taskType === 'measurement' || task.taskType === 'MEASUREMENT') || [],
      custom: part.tasks?.filter((task: any) => task.taskType === 'custom' || task.taskType === 'CUSTOM') || []
    };

    // Display legacy alterations if they exist
    if (part.alterations && part.alterations.length > 0) {
      part.alterations.forEach((alteration: string) => {
        receipt += `• ${alteration}\n`;
      });
    }

    // Display categorized tasks (compact format)
    if (taskGroups.alteration.length > 0) {
      taskGroups.alteration.forEach((task: any) => {
        receipt += `• ${task.taskName}\n`;
      });
    }

    if (taskGroups.button_work.length > 0) {
      taskGroups.button_work.forEach((task: any) => {
        receipt += `• ${task.taskName}\n`;
      });
    }

    if (taskGroups.measurement.length > 0) {
      taskGroups.measurement.forEach((task: any) => {
        receipt += `• ${task.taskName}\n`;
      });
    }

    if (taskGroups.custom.length > 0) {
      taskGroups.custom.forEach((task: any) => {
        receipt += `• ${task.taskName}\n`;
      });
    }
    
    receipt += '\n';
    receipt += `QR: ${part.qrCode}\n`;
    receipt += 'Riverside Men\'s Shop\n';
    
    // Cut after each part (except the last one)
    if (index < parts.length - 1) {
      receipt += '\x1B' + 'm'; // Full cut
      receipt += '\n'; // Feed paper
    }
  });
  
  return receipt;
}

/**
 * Format complete alterations ticket for receipt printer (all sections together)
 */
export function formatCompleteAlterationsTicket(ticketData: any): string {
  const {
    jobNumber,
    partyName,
    memberName,
    memberRole,
    eventDate,
    customerPhone,
    dueDate,
    measurements,
    parts,
    assignedStaff
  } = ticketData;

  let receipt = '';
  
  // Header
  receipt += '='.repeat(32) + '\n';
  receipt += '    ALTERATIONS TICKET\n';
  receipt += '='.repeat(32) + '\n\n';
  
  // Job info
  receipt += `Job: ${jobNumber}\n`;
  receipt += `Date: ${new Date().toLocaleDateString()}\n`;
  receipt += `Time: ${new Date().toLocaleTimeString()}\n\n`;
  
  // Customer info
  receipt += 'CUSTOMER INFORMATION:\n';
  receipt += `Name: ${memberName}\n`;
  receipt += `Phone: ${customerPhone}\n`;
  if (partyName) {
    receipt += `Party: ${partyName}\n`;
    receipt += `Role: ${memberRole}\n`;
  }
  if (dueDate) {
    receipt += `Due Date: ${new Date(dueDate).toLocaleDateString()}\n`;
  } else if (eventDate) {
    receipt += `Event Date: ${new Date(eventDate).toLocaleDateString()}\n`;
  }
  
  // Staff assignment
  if (assignedStaff) {
    receipt += `Staff Member: ${assignedStaff}\n`;
  }
  receipt += '\n';
  
  // Measurements
  if (measurements) {
    receipt += 'MEASUREMENTS:\n';
    Object.entries(measurements).forEach(([key, value]) => {
      if (value) {
        receipt += `${key}: ${value}\n`;
      }
    });
    receipt += '\n';
  }
  
  // Summary of all alterations needed
  receipt += '='.repeat(32) + '\n';
  receipt += '    ALL ALTERATIONS NEEDED\n';
  receipt += '='.repeat(32) + '\n\n';
  
  // List all alterations by category
  const allTasks: { [key: string]: Array<{ task: string; part: string }> } = {
    alteration: [],
    button_work: [],
    measurement: [],
    custom: []
  };
  
  parts.forEach((part: any) => {
    if (part.tasks) {
      part.tasks.forEach((task: any) => {
        const taskType = task.taskType?.toLowerCase() || 'alteration';
        if (allTasks[taskType as keyof typeof allTasks]) {
          allTasks[taskType as keyof typeof allTasks].push({
            task: task.taskName,
            part: part.partName
          });
        }
      });
    }
  });
  
  // Display summary by category
  if (allTasks.alteration.length > 0) {
    receipt += 'ALTERATIONS:\n';
    allTasks.alteration.forEach((item: any) => {
      receipt += `• ${item.task} (${item.part})\n`;
    });
    receipt += '\n';
  }
  
  if (allTasks.button_work.length > 0) {
    receipt += 'BUTTON WORK:\n';
    allTasks.button_work.forEach((item: any) => {
      receipt += `• ${item.task} (${item.part})\n`;
    });
    receipt += '\n';
  }
  
  if (allTasks.measurement.length > 0) {
    receipt += 'MEASUREMENTS:\n';
    allTasks.measurement.forEach((item: any) => {
      receipt += `• ${item.task} (${item.part})\n`;
    });
    receipt += '\n';
  }
  
  if (allTasks.custom.length > 0) {
    receipt += 'CUSTOM TASKS:\n';
    allTasks.custom.forEach((item: any) => {
      receipt += `• ${item.task} (${item.part})\n`;
    });
    receipt += '\n';
  }
  
  receipt += '='.repeat(32) + '\n';
  receipt += '    INDIVIDUAL GARMENT SECTIONS\n';
  receipt += '='.repeat(32) + '\n\n';
  
  parts.forEach((part: any, index: number) => {
    receipt += `${index + 1}. ${part.partName.toUpperCase()}\n`;
    receipt += `   QR: ${part.qrCode}\n`;
    
    // Group tasks by type
    const taskGroups = {
      alteration: part.tasks?.filter((task: any) => task.taskType === 'alteration' || task.taskType === 'ALTERATION') || [],
      button_work: part.tasks?.filter((task: any) => task.taskType === 'button_work' || task.taskType === 'BUTTON_WORK') || [],
      measurement: part.tasks?.filter((task: any) => task.taskType === 'measurement' || task.taskType === 'MEASUREMENT') || [],
      custom: part.tasks?.filter((task: any) => task.taskType === 'custom' || task.taskType === 'CUSTOM') || []
    };

    // Display legacy alterations if they exist
    if (part.alterations && part.alterations.length > 0) {
      receipt += `   Alterations:\n`;
      part.alterations.forEach((alteration: string) => {
        receipt += `   • ${alteration}\n`;
      });
    }

    // Display categorized tasks
    if (taskGroups.alteration.length > 0) {
      receipt += `   Alterations:\n`;
      taskGroups.alteration.forEach((task: any) => {
        receipt += `   • ${task.taskName}\n`;
      });
    }

    if (taskGroups.button_work.length > 0) {
      receipt += `   Button Work:\n`;
      taskGroups.button_work.forEach((task: any) => {
        receipt += `   • ${task.taskName}\n`;
      });
    }

    if (taskGroups.measurement.length > 0) {
      receipt += `   Measurements:\n`;
      taskGroups.measurement.forEach((task: any) => {
        receipt += `   • ${task.taskName}\n`;
      });
    }

    if (taskGroups.custom.length > 0) {
      receipt += `   Custom Tasks:\n`;
      taskGroups.custom.forEach((task: any) => {
        receipt += `   • ${task.taskName}\n`;
      });
    }
    
    receipt += '\n';
    
    // Actual printer cut command between parts
    if (index < parts.length - 1) {
      receipt += '\x1B' + 'm'; // Full cut
      receipt += '\n'; // Feed paper
    }
  });
  
  // Footer
  receipt += '='.repeat(32) + '\n';
  receipt += 'Scan QR codes to track progress\n';
  receipt += 'Riverside Men\'s Shop\n';
  receipt += '716-833-8401\n';
  receipt += '='.repeat(32) + '\n';
  
  return receipt;
}

/**
 * Send text to local printer with cut commands
 * This would integrate with the local printer system
 */
async function sendToLocalPrinter(receiptText: string): Promise<{ success: boolean; error?: string }> {
  try {
    // This is a placeholder for local printer integration
    // In a real implementation, you would:
    // 1. Use the local printer system (CUPS, Windows Print Spooler, etc.)
    // 2. Send the formatted text to the default or selected printer
    // 3. Handle printer status and errors
    // 4. Process ESC/POS commands for cuts
    
    console.log('Sending to local printer with cuts:');
    console.log(receiptText);
    
    // Process cut commands for display (in real implementation, these would be sent to printer)
    const processedText = receiptText.replace(/\x1Bm/g, '\n--- CUT HERE ---\n');
    console.log('Processed text (cut commands shown):');
    console.log(processedText);
    
    // For now, we'll simulate success
    // In production, replace this with actual local printer integration
    // Example: Use node-printer or similar library
    // The \x1Bm commands would be sent as ESC/POS commands to the printer
    return { success: true };
    
  } catch (error) {
    console.error('Local printer error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown printer error' 
    };
  }
} 