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