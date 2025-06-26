const prisma = require('../prismaClient');
const { setCustomFieldValue } = require('../lightspeedClient');
const { getOrCreateSuitSyncAppointmentsField } = require('../services/workflowService');
const logger = require('../utils/logger');

/**
 * Fetches all appointments for a given party from the local database
 * and returns the Lightspeed Customer ID and the appointments list.
 */
const getAppointmentsAndLsCustomerId = async (partyId) => {
  const party = await prisma.party.findUnique({
    where: { id: partyId },
    include: {
      members: {
        take: 1, // We only need one member to find the anchor customer in LS
      },
      appointments: {
        orderBy: { dateTime: 'asc' },
        include: { tailor: true, member: true },
      },
    },
  });

  if (!party) {
    throw new Error('Party not found');
  }

  // The appointments are stored on a single customer record in Lightspeed.
  // We'll use the *first* member of the party as the anchor customer.
  const anchorMember = party.members[0];
  if (!anchorMember || !anchorMember.lsCustomerId) {
    // This can happen if a party is created with no members yet.
    // In this case, we can't sync, but it's not a fatal error.
    throw new Error('No members found for this party to use as Lightspeed anchor.');
  }

  return {
    lightspeedCustomerId: anchorMember.lsCustomerId,
    appointments: party.appointments,
  };
};

/**
 * Synchronizes the local list of appointments for a party with the
 * 'suitsync_appointments_json' custom field on the Lightspeed Customer.
 */
const syncAppointmentsToLightspeed = async (req, partyId) => {
  try {
    const { lightspeedCustomerId, appointments } = await getAppointmentsAndLsCustomerId(partyId);
    const appointmentsField = await getOrCreateSuitSyncAppointmentsField();
    
    // We only need to store a subset of data in Lightspeed
    const payload = appointments.map(appt => ({
      id: appt.id,
      dateTime: appt.dateTime,
      type: appt.type,
      tailor: appt.tailor?.name,
      member: appt.member?.notes, // assuming member notes have a name
      notes: appt.notes,
    }));

    await setCustomFieldValue(req.session, {
      customFieldId: appointmentsField.id,
      resourceId: lightspeedCustomerId,
      value: JSON.stringify(payload),
    });
    
    logger.info(`Successfully synced ${payload.length} appointments to LS Customer ${lightspeedCustomerId}.`);
  } catch (error) {
    // This is a background sync, so we log it as a warning but don't fail the user request.
    logger.warn(`Could not sync appointments to Lightspeed for party ${partyId}:`, error.message);
  }
};

exports.listAppointments = async (req, res) => {
  try {
    const appointments = await prisma.appointment.findMany({
      include: { party: true, tailor: true, member: true },
      orderBy: { dateTime: 'desc' },
    });
    res.json(appointments);
  } catch (err) {
    logger.error('Error listing appointments:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.createAppointment = async (req, res) => {
  try {
    const { partyId, dateTime, durationMinutes, tailorId, memberId, type, notes } = req.body;
    
    const appointment = await prisma.appointment.create({
      data: { 
        partyId, 
        dateTime: new Date(dateTime), 
        durationMinutes, 
        tailorId, 
        memberId,
        type, 
        notes 
      },
    });

    // Sync the entire list to Lightspeed in the background
    await syncAppointmentsToLightspeed(req, partyId);

    res.status(201).json(appointment);
  } catch (err) {
    logger.error('Error creating appointment:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.updateAppointment = async (req, res) => {
  try {
    const appointmentId = parseInt(req.params.id);
    const { dateTime, durationMinutes, tailorId, memberId, type, notes, status } = req.body;

    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        dateTime: dateTime ? new Date(dateTime) : undefined,
        durationMinutes,
        tailorId,
        memberId,
        type,
        notes,
        status,
      },
    });

    // Sync the entire list to Lightspeed in the background
    await syncAppointmentsToLightspeed(req, updatedAppointment.partyId);

    res.json(updatedAppointment);
  } catch (err) {
    logger.error(`Error updating appointment ${req.params.id}:`, err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.deleteAppointment = async (req, res) => {
  try {
    const appointmentId = parseInt(req.params.id);
    const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId }});
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    await prisma.appointment.delete({ where: { id: appointmentId } });
    
    // Sync the entire list to Lightspeed in the background
    await syncAppointmentsToLightspeed(req, appointment.partyId);

    res.status(204).send();
  } catch (err) {
    logger.error(`Error deleting appointment ${req.params.id}:`, err);
    res.status(500).json({ error: 'Internal server error' });
  }
}; 