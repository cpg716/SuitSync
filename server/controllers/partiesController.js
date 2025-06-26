const prisma = require('../prismaClient');
const logger = require('../utils/logger');
const { createLightspeedClient, searchLightspeed } = require('../lightspeedClient');
const { getOrCreateSuitSyncPartyField } = require('../services/workflowService');

exports.listParties = async (req, res) => {
  try {
    const parties = await prisma.party.findMany({
      include: {
        members: true,
        _count: {
          select: { members: true }
        }
      },
      orderBy: { eventDate: 'desc' },
    });
    res.json(parties);
  } catch (err) {
    console.error('Error in listParties:', err.message);
    res.status(500).json({ error: 'Failed to retrieve parties.' });
  }
};

exports.getPartyDetail = async (req, res) => {
  try {
    const party = await prisma.party.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        members: true,
        appointments: true,
        alterationJobs: true
      }
    });
    if (!party) return res.status(404).json({ error: 'Party not found' });
    res.json(party);
  } catch (err) {
    console.error('Error getting party detail:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.createParty = async (req, res) => {
  const { name, eventDate, notes, members } = req.body;

  if (!name || !eventDate) {
    return res.status(400).json({ error: 'Party name and event date are required.' });
  }

  let party;
  const lightspeedClient = createLightspeedClient(req);

  try {
    // Step 1: Create the Party in the local database
    party = await prisma.party.create({
      data: {
        name,
        eventDate: new Date(eventDate),
        notes,
      },
    });

    // Step 2: Create a Customer Group in Lightspeed
    const groupName = `SuitSync Party #${party.id}: ${name}`;
    const { data: lsGroup } = await lightspeedClient.post('/customer_groups', { name: groupName });
    const lightspeedGroupId = lsGroup.id;

    // Step 3: Update local party with the Lightspeed Group ID
    await prisma.party.update({
      where: { id: party.id },
      data: { lightspeedGroupId: String(lightspeedGroupId) },
    });

    // Step 4: Process each member
    if (members && members.length > 0) {
      for (const member of members) {
        let lsCustomerId;

        // a. Search for existing customer by email
        if (member.email) {
          const searchResults = await searchLightspeed(lightspeedClient, 'Customer', { email: member.email });
          if (searchResults && searchResults.length > 0) {
            lsCustomerId = searchResults[0].id;
            logger.info(`Found existing Lightspeed customer with email ${member.email}, ID: ${lsCustomerId}`);
          }
        }

        // b. If not found, create a new customer in Lightspeed
        if (!lsCustomerId) {
          const { data: newLsCustomer } = await lightspeedClient.post('/customers', {
            first_name: member.firstName,
            last_name: member.lastName,
            contact: {
              emails: [{ address: member.email, type: 'primary' }],
              phones: [{ number: member.phone, type: 'mobile' }],
            }
          });
          lsCustomerId = newLsCustomer.id;
          logger.info(`Created new Lightspeed customer for ${member.email}, ID: ${lsCustomerId}`);
        }

        // c. Add the Lightspeed customer to the Lightspeed Customer Group
        await lightspeedClient.post(`/customer_groups/${lightspeedGroupId}/customers`, {
          customer_ids: [lsCustomerId]
        });

        // d. Create the PartyMember in the local database
        await prisma.partyMember.create({
          data: {
            party: { connect: { id: party.id } },
            role: member.role,
            lsCustomerId: String(lsCustomerId),
            notes: `Name: ${member.firstName} ${member.lastName}`,
          }
        });
      }
    }

    const finalParty = await prisma.party.findUnique({
      where: { id: party.id },
      include: { members: true },
    });

    res.status(201).json(finalParty);
  } catch (err) {
    logger.error('Error creating party:', err.response ? JSON.stringify(err.response.data, null, 2) : err.message);
    if (party && party.id) {
      await prisma.party.delete({ where: { id: party.id } });
      logger.info(`Rolled back creation of local party ${party.id} due to API error.`);
    }
    res.status(500).json({ error: 'Failed to create party.' });
  }
}; 