const prisma = require('../prismaClient');

exports.listAlterations = async (req, res) => {
  try {
    const jobs = await prisma.alterationJob.findMany({
      include: { party: true, customer: true, tailor: true, jobParts: true }
    });
    res.json(jobs);
  } catch (err) {
    console.error('Error listing alterations:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.createAlteration = async (req, res) => {
  try {
    const { saleLineItemId, partyId, customerId, notes, status, timeSpentMinutes, tailorId, measurements } = req.body;
    const job = await prisma.alterationJob.create({
      data: { saleLineItemId, partyId, customerId, notes, status, timeSpentMinutes, tailorId, measurements }
    });
    res.status(201).json(job);
  } catch (err) {
    console.error('Error creating alteration:', err);
    res.status(500).json({ error: 'Internal server error' });
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