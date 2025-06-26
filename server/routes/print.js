const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');

// Simple ZPL generator for alteration tags
function generateZPLTag(job) {
  // ZPL: ^XA ... ^XZ
  // Example fields: job.id, job.customerName, job.itemType, job.scheduledDateTime, job.tailorName
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

router.post('/tag', async (req, res) => {
  const { jobId, format } = req.body;
  if (!jobId) return res.status(400).json({ error: 'Missing jobId' });
  try {
    const job = await prisma.alterationJob.findUnique({
      where: { id: Number(jobId) },
      include: {
        party: { include: { customer: true } },
        tailor: true,
      },
    });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    // Flatten fields for ZPL
    const jobData = {
      id: job.id,
      customerName: job.party?.customer?.name || '',
      itemType: job.itemType || '',
      scheduledDateTime: job.scheduledDateTime,
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
});

module.exports = router; 