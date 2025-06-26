const prisma = require('../prismaClient');

exports.listParties = async (req, res) => {
  try {
    const parties = await prisma.party.findMany({
      include: { members: true, appointments: true, alterationJobs: true }
    });
    res.json(parties);
  } catch (err) {
    console.error('Error listing parties:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getPartyDetail = async (req, res) => {
  try {
    const party = await prisma.party.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { members: true, appointments: true, alterationJobs: true }
    });
    if (!party) return res.status(404).json({ error: 'Party not found' });
    res.json(party);
  } catch (err) {
    console.error('Error getting party detail:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.createParty = async (req, res) => {
  try {
    const { name, eventDate, customerId, notes } = req.body;
    const party = await prisma.party.create({
      data: { name, eventDate: new Date(eventDate), customerId, notes }
    });
    res.status(201).json(party);
  } catch (err) {
    console.error('Error creating party:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}; 