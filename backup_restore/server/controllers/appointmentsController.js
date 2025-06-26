const prisma = require('../prismaClient');

exports.listAppointments = async (req, res) => {
  try {
    const appointments = await prisma.appointment.findMany({
      include: { party: true, tailor: true, member: true }
    });
    res.json(appointments);
  } catch (err) {
    console.error('Error listing appointments:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.createAppointment = async (req, res) => {
  try {
    const { partyId, dateTime, durationMinutes, tailorId, type, notes } = req.body;
    const appointment = await prisma.appointment.create({
      data: { partyId, dateTime: new Date(dateTime), durationMinutes, tailorId, type, notes }
    });
    res.status(201).json(appointment);
  } catch (err) {
    console.error('Error creating appointment:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}; 