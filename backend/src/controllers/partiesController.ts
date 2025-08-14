import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import logger from '../utils/logger';
import { createLightspeedClient, searchLightspeed } from '../lightspeedClient';
import { getOrCreateSuitSyncPartyField, verifyAndGetCustomField, createOrUpdateCustomField, initialize as initializeWorkflow } from '../services/workflowService';
import { processWebhook } from '../services/webhookService';
import { sendPartyMemberInvitations } from '../services/partyNotificationService';
import { Route, Get, Path, Tags } from 'tsoa';
import AuditLogService from '../services/AuditLogService';
import { lightspeedCustomFieldsService } from '../services/lightspeedCustomFieldsService';

const prisma = new PrismaClient().$extends(withAccelerate());

@Route('parties')
@Tags('Parties')
export class PartyController {
  /** List all parties */
  @Get('/')
  public async list(): Promise<any[]> {
    return prisma.party.findMany({
      include: { members: true, _count: { select: { members: true } } },
      orderBy: { eventDate: 'desc' },
    });
  }

  /** Get party by ID */
  @Get('{id}')
  public async getById(@Path() id: number): Promise<any | null> {
    return prisma.party.findUnique({
      where: { id },
      include: { members: true, _count: { select: { members: true } } },
    });
  }
}

// listParties
// Lists parties and supports search by party name, member role/notes.
// Future: can extend to search member phone normalized.
export const listParties = async (req: Request, res: Response): Promise<void> => {
  try {
    const search = (req.query.search as string | undefined) || '';
    const where: any = {};
    if (search && search.trim().length > 0) {
      const norm = search.replace(/[^0-9a-zA-Z@\.\s]/g, '');
      const textLike = norm;
      where.OR = [
        { name: { contains: textLike, mode: 'insensitive' } },
        { members: { some: { OR: [
          { role: { contains: textLike, mode: 'insensitive' } },
          { notes: { contains: textLike, mode: 'insensitive' } },
        ] } } },
      ];
    }

    // Fetch local parties (optionally filtered)
    const parties = await prisma.party.findMany({
      where,
      include: {
        members: true,
        _count: { select: { members: true } },
      },
      orderBy: { eventDate: 'desc' },
    });

    // Optionally sync with Lightspeed Customer Groups if authenticated
    let lightspeedGroups: any[] = [];
    if (req.session?.lsAccessToken) {
      try {
        const lightspeedClient = createLightspeedClient(req);
        const response = await lightspeedClient.fetchAllWithPagination('/customer_groups');
        lightspeedGroups = response || [];
        logger.info(`[PartiesController] Fetched ${lightspeedGroups.length} customer groups from Lightspeed`);
      } catch (error: any) {
        logger.warn('[PartiesController] Failed to fetch Lightspeed customer groups:', {
          message: error.message,
          status: error.response?.status
        });
        // Don't fail the entire request if Lightspeed is unavailable
      }
    }

    res.json({
      parties,
      lightspeedGroups: lightspeedGroups.filter(group =>
        group.name?.includes('SuitSync Party') || parties.some(p => p.lightspeedGroupId === String(group.id))
      )
    });
  } catch (err: any) {
    logger.error('Error in listParties:', err);
    res.status(500).json({ error: 'Failed to retrieve parties.' });
  }
};

export const getPartyDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    const party = await prisma.party.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        members: true,
        appointments: true,
        alterationJobs: true
      }
    });
    if (!party) {
      res.status(404).json({ error: 'Party not found' });
      return;
    }
    res.json(party);
  } catch (err: any) {
    console.error('Error getting party detail:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createParty = async (req: Request, res: Response): Promise<void> => {
  const { 
    eventDate, 
    suitStyle, 
    suitColor, 
    notes, 
    salesPersonId, 
    customerId, 
    members 
  } = req.body;

  if (!eventDate || !salesPersonId || !members || members.length === 0) {
    res.status(400).json({ 
      error: 'Event date, sales person, and at least one member are required.' 
    });
    return;
  }

  let party;
  const lightspeedClient = createLightspeedClient(req);
  
  try {
    // Step 1: Process the groom first to get the customer ID for the party
    const groom = members.find((m: any) => m.role === 'GROOM');
    if (!groom) {
      res.status(400).json({ error: 'Groom is required for party creation.' });
      return;
    }

    let partyCustomerId = customerId; // Use provided customerId if available
    
    // If no customerId provided, process the groom to create/get customer
    if (!partyCustomerId) {
      let lsCustomerId;
      
      // a. If groom has a customerId, use existing customer
      if (groom.customerId) {
        const existingCustomer = await prisma.customer.findUnique({
          where: { id: groom.customerId }
        });
        if (existingCustomer) {
          lsCustomerId = existingCustomer.lightspeedId;
          partyCustomerId = existingCustomer.id;
        }
      }
      
      // b. If no existing customer, search for existing customer by email
      if (!lsCustomerId && groom.email) {
        const searchResults = await searchLightspeed(lightspeedClient, 'Customer', { email: groom.email });
        if (searchResults && searchResults.length > 0) {
          lsCustomerId = searchResults[0].id;
          logger.info(`Found existing Lightspeed customer with email ${groom.email}, ID: ${lsCustomerId}`);
          
          // Check if we have this customer locally
          const localCustomer = await prisma.customer.findFirst({
            where: { lightspeedId: String(lsCustomerId) }
          });
          if (localCustomer) {
            partyCustomerId = localCustomer.id;
          }
        }
      }

      // c. If not found, create a new customer in Lightspeed
      if (!lsCustomerId) {
        const [firstName, ...lastNameParts] = groom.fullName.split(' ');
        const lastName = lastNameParts.join(' ');
        
        const customerData = {
          first_name: firstName,
          last_name: lastName,
          contact: {
            emails: groom.email ? [{ address: groom.email, type: 'primary' }] : [],
            phones: [{ number: groom.phone, type: 'mobile' }],
          }
        };
        
        const response = await lightspeedClient.post('/customers', customerData);
        if (!response) throw new Error('No response from Lightspeed');
        const newLsCustomer = response.data;
        lsCustomerId = newLsCustomer.id;
        logger.info(`Created new Lightspeed customer for groom ${groom.fullName}, ID: ${lsCustomerId}`);
        
        // Create local customer record
        const newLocalCustomer = await prisma.customer.create({
          data: {
            lightspeedId: String(lsCustomerId),
            first_name: firstName,
            last_name: lastName,
            email: groom.email,
            phone: groom.phone,
            name: groom.fullName
          }
        });
        partyCustomerId = newLocalCustomer.id;
      }
    }

    // Step 2: Create the Party in the local database
    party = await prisma.party.create({
      data: {
        // eventDate comes as yyyy-mm-dd; store at midnight local time
        eventDate: new Date(`${eventDate}T00:00:00`),
        notes: notes || '',
        suitStyle: suitStyle || '',
        suitColor: suitColor || '',
        salesPersonId: Number(salesPersonId),
        customerId: Number(partyCustomerId),
      },
    });

    // Step 2: Create a Customer Group in Lightspeed
    // Extract groom's last name for the group name
    const groomLastName = groom.fullName.split(' ').slice(-1)[0]; // Get last name
    const weddingDate = new Date(eventDate);
    const formattedDate = `${(weddingDate.getMonth() + 1).toString().padStart(2, '0')}/${weddingDate.getDate().toString().padStart(2, '0')}/${weddingDate.getFullYear().toString().slice(-2)}`;
    const groupName = `${groomLastName} ${formattedDate}`;
    const response = await lightspeedClient.post('/customer_groups', { name: groupName });
    if (!response) throw new Error('No response from Lightspeed');
    const lsGroup = response.data;
    const lightspeedGroupId = lsGroup.id;

    // Step 3: Update local party with the Lightspeed Group ID
    await prisma.party.update({
      where: { id: party.id },
      data: { lightspeedGroupId: String(lightspeedGroupId) },
    });

    // Step 4: Process each member
    const createdMembers = [];
    for (const member of members) {
      let lsCustomerId;
      
      // Skip groom processing since we already handled it
      if (member.role === 'GROOM') {
        // For groom, use the customer we already processed
        const groomCustomer = await prisma.customer.findUnique({
          where: { id: Number(partyCustomerId) }
        });
        if (groomCustomer) {
          lsCustomerId = groomCustomer.lightspeedId;
        }
      } else {
        // For other members, process normally
        // a. If member has a customerId, use existing customer
        if (member.customerId) {
          const existingCustomer = await prisma.customer.findUnique({
            where: { id: member.customerId }
          });
          if (existingCustomer) {
            lsCustomerId = existingCustomer.lightspeedId;
          }
        }
        
        // b. If no existing customer, search for existing customer by email
        if (!lsCustomerId && member.email) {
          const searchResults = await searchLightspeed(lightspeedClient, 'Customer', { email: member.email });
          if (searchResults && searchResults.length > 0) {
            lsCustomerId = searchResults[0].id;
            logger.info(`Found existing Lightspeed customer with email ${member.email}, ID: ${lsCustomerId}`);
          }
        }

        // c. If not found, create a new customer in Lightspeed
        if (!lsCustomerId) {
          const [firstName, ...lastNameParts] = member.fullName.split(' ');
          const lastName = lastNameParts.join(' ');
          
          const customerData = {
            first_name: firstName,
            last_name: lastName,
            contact: {
              emails: member.email ? [{ address: member.email, type: 'primary' }] : [],
              phones: [{ number: member.phone, type: 'mobile' }],
            }
          };
          
          const response = await lightspeedClient.post('/customers', customerData);
          if (!response) throw new Error('No response from Lightspeed');
          const newLsCustomer = response.data;
          lsCustomerId = newLsCustomer.id;
          logger.info(`Created new Lightspeed customer for ${member.fullName}, ID: ${lsCustomerId}`);
          
          // Create local customer record for non-groom members
          await prisma.customer.create({
            data: {
              lightspeedId: String(lsCustomerId),
              first_name: firstName,
              last_name: lastName,
              email: member.email,
              phone: member.phone,
              name: member.fullName
            }
          });
        }
      }

      // d. Add the Lightspeed customer to the Lightspeed Customer Group
      await lightspeedClient.post(`/customer_groups/${lightspeedGroupId}/customers`, {
        customer_ids: [lsCustomerId]
      });

      // e. Create the PartyMember in the local database
      const createdMember = await prisma.partyMember.create({
        data: {
          party: { connect: { id: party.id } },
          role: member.role,
          lsCustomerId: String(lsCustomerId),
          notes: `Name: ${member.fullName}, Phone: ${member.phone}${member.email ? `, Email: ${member.email}` : ''}`,
          status: 'Selected'
        }
      });

      createdMembers.push({
        ...createdMember,
        fullName: member.fullName,
        phone: member.phone,
        email: member.email
      });
    }

    // Step 5: Send invitation notifications to all members
    try {
      await sendPartyMemberInvitations(party.id, createdMembers, party.eventDate);
      logger.info(`Sent invitation notifications to ${createdMembers.length} party members`);
    } catch (notificationError) {
      logger.error('Error sending party member invitations:', notificationError);
      // Don't fail the party creation if notifications fail
    }

    const finalParty = await prisma.party.findUnique({
      where: { id: party.id },
      include: { 
        members: true,
        customer: true,
        salesPerson: true
      },
    });

    res.status(201).json(finalParty);
  } catch (err: any) {
    logger.error('Error creating party:', err.response ? JSON.stringify(err.response.data, null, 2) : err.message);
    if (party && party.id) {
      await prisma.party.delete({ where: { id: party.id } });
      logger.info(`Rolled back creation of local party ${party.id} due to API error.`);
    }
    res.status(500).json({ error: 'Failed to create party.' });
  }
}; 

export const getPartiesWithStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const parties = await prisma.party.findMany({
      include: {
        members: true,
        appointments: true,
        alterationJobs: true
      },
      orderBy: { eventDate: 'desc' },
    });
    res.json(parties);
  } catch (err: any) {
    logger.error('Error in getPartiesWithStatus:', err);
    res.status(500).json({ error: 'Failed to retrieve parties with status.' });
  }
};

export const getPartyStatusSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const partyId = parseInt(req.params.id);
    const party = await prisma.party.findUnique({
      where: { id: partyId },
      include: {
        members: true,
        appointments: true,
        alterationJobs: true
      }
    });
    if (!party) {
      res.status(404).json({ error: 'Party not found' });
      return;
    }
    res.json(party);
  } catch (err: any) {
    logger.error('Error in getPartyStatusSummary:', err);
    res.status(500).json({ error: 'Failed to retrieve party status summary.' });
  }
};

export const updateParty = async (req: Request, res: Response): Promise<void> => {
  try {
    const partyId = parseInt(req.params.id);
    const updateData = req.body;
    
    const party = await prisma.party.update({
      where: { id: partyId },
      data: updateData,
      include: {
        members: true,
        appointments: true,
        alterationJobs: true
      }
    });
    res.json(party);
  } catch (err: any) {
    logger.error('Error in updateParty:', err);
    res.status(500).json({ error: 'Failed to update party.' });
  }
};

export const deleteParty = async (req: Request, res: Response): Promise<void> => {
  try {
    const partyId = parseInt(req.params.id);
    await prisma.party.delete({
      where: { id: partyId }
    });
    res.json({ message: 'Party deleted successfully' });
  } catch (err: any) {
    logger.error('Error in deleteParty:', err);
    res.status(500).json({ error: 'Failed to delete party.' });
  }
};

export const addMemberToParty = async (req: Request, res: Response): Promise<void> => {
  try {
    const partyId = parseInt(req.params.id);
    const memberData = req.body;
    
    const member = await prisma.partyMember.create({
      data: {
        ...memberData,
        partyId
      },
      include: {
        party: true
      }
    });
    res.json(member);
  } catch (err: any) {
    logger.error('Error in addMemberToParty:', err);
    res.status(500).json({ error: 'Failed to add member to party.' });
  }
};

export const updatePartyMemberStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const memberId = parseInt(req.params.memberId);
    const { status, suitOrderId, accessoriesOrderId, notes } = req.body as any;
    // Prepare timestamp fields based on status transitions
    const timestampUpdates: any = {};
    if (status === 'ordered') timestampUpdates.orderedAt = new Date();
    if (status === 'received') timestampUpdates.receivedAt = new Date();
    if (status === 'being_altered') timestampUpdates.alteredAt = new Date();
    if (status === 'ready_for_pickup') timestampUpdates.readyForPickupAt = new Date();

    const member = await prisma.partyMember.update({
      where: { id: memberId },
      data: {
        ...(status ? { status } : {}),
        ...(suitOrderId !== undefined ? { suitOrderId } : {}),
        ...(accessoriesOrderId !== undefined ? { accessoriesOrderId } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...timestampUpdates,
      },
      include: {
        party: true
      }
    });

    // Sync to Lightspeed custom fields if possible (map lsCustomerId -> local customer)
    try {
      if (member.lsCustomerId) {
        const localCustomer = await prisma.customer.findFirst({ where: { lightspeedId: String(member.lsCustomerId) } });
        if (localCustomer) {
          await lightspeedCustomFieldsService.syncCustomerToLightspeed(req, localCustomer.id);
        }
      }
    } catch (syncErr: any) {
      logger.warn('Failed syncing party member status to Lightspeed custom fields', { memberId, error: syncErr?.message });
    }

    res.json(member);
  } catch (err: any) {
    logger.error('Error in updatePartyMemberStatus:', err);
    res.status(500).json({ error: 'Failed to update party member status.' });
  }
};

export const removeMemberFromParty = async (req: Request, res: Response): Promise<void> => {
  try {
    const memberId = parseInt(req.params.memberId);
    await prisma.partyMember.delete({
      where: { id: memberId }
    });
    res.json({ message: 'Member removed from party successfully' });
  } catch (err: any) {
    logger.error('Error in removeMemberFromParty:', err);
    res.status(500).json({ error: 'Failed to remove member from party.' });
  }
}; 

/**
 * Build a timeline view for a party: per-member row with appointments and alteration jobs
 */
export const getPartyTimeline = async (req: Request, res: Response): Promise<void> => {
  try {
    const partyId = parseInt(req.params.id);
    const party = await prisma.party.findUnique({
      where: { id: partyId },
      include: {
        members: true,
        appointments: true,
        alterationJobs: true,
      }
    });
    if (!party) {
      res.status(404).json({ error: 'Party not found' });
      return;
    }
    // Fetch per-member appointments and jobs
    const memberRows = await Promise.all(
      party.members.map(async (m) => {
        const [appointments, alterationJobs] = await Promise.all([
          prisma.appointment.findMany({ where: { memberId: m.id }, orderBy: { dateTime: 'asc' } }),
          prisma.alterationJob.findMany({ where: { partyMemberId: m.id }, orderBy: { createdAt: 'asc' } }),
        ]);
        return {
          memberId: m.id,
          name: (m.notes || '').replace(/^Name:\s*/i, '').split(',')[0] || m.role,
          role: m.role,
          status: m.status,
          lsCustomerId: m.lsCustomerId,
          appointments,
          alterationJobs,
        };
      })
    );

    res.json({
      partyId: party.id,
      eventDate: party.eventDate,
      timeline: memberRows,
    });
  } catch (err: any) {
    logger.error('Error building party timeline:', err);
    res.status(500).json({ error: 'Failed to build party timeline.' });
  }
};

/** Bulk set members that need_to_order -> ordered (sets orderedAt) */
export const triggerBulkOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const partyId = parseInt(req.params.id);
    const members = await prisma.partyMember.findMany({ where: { partyId, status: 'need_to_order' as any } });
    const results = [] as any[];
    for (const m of members) {
      const updated = await prisma.partyMember.update({
        where: { id: m.id },
        data: { status: 'ordered' as any, orderedAt: new Date() },
      });
      results.push(updated);
      // Sync LS custom fields for each member's linked customer
      try {
        if (m.lsCustomerId) {
          const localCustomer = await prisma.customer.findFirst({ where: { lightspeedId: String(m.lsCustomerId) } });
          if (localCustomer) await lightspeedCustomFieldsService.syncCustomerToLightspeed(req, localCustomer.id);
        }
      } catch (e: any) {
        logger.warn('Bulk order LS sync failed for member', { memberId: m.id, error: e?.message });
      }
    }
    res.json({ updated: results.length });
  } catch (err: any) {
    logger.error('Error in triggerBulkOrder:', err);
    res.status(500).json({ error: 'Failed to trigger bulk order.' });
  }
};

/** Advance a specific member to a new status and set appropriate timestamps */
export const advanceMemberStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const partyId = parseInt(req.params.id);
    const memberId = parseInt(req.params.memberId);
    const { newStatus } = req.body as { newStatus: string };
    if (!newStatus) {
      res.status(400).json({ error: 'newStatus is required' });
      return;
    }
    const timestampUpdates: any = {};
    if (newStatus === 'ordered') timestampUpdates.orderedAt = new Date();
    if (newStatus === 'received') timestampUpdates.receivedAt = new Date();
    if (newStatus === 'being_altered') timestampUpdates.alteredAt = new Date();
    if (newStatus === 'ready_for_pickup') timestampUpdates.readyForPickupAt = new Date();
    const updated = await prisma.partyMember.update({
      where: { id: memberId },
      data: { status: newStatus as any, ...timestampUpdates },
    });
    // Sync LS custom fields
    try {
      if (updated.lsCustomerId) {
        const localCustomer = await prisma.customer.findFirst({ where: { lightspeedId: String(updated.lsCustomerId) } });
        if (localCustomer) await lightspeedCustomFieldsService.syncCustomerToLightspeed(req, localCustomer.id);
      }
    } catch (e: any) {
      logger.warn('Advance status LS sync failed', { memberId, error: e?.message });
    }
    res.json(updated);
  } catch (err: any) {
    logger.error('Error in advanceMemberStatus:', err);
    res.status(500).json({ error: 'Failed to advance member status.' });
  }
};

/** Notify pickup for a member on a specific date */
export const notifyPickup = async (req: Request, res: Response): Promise<void> => {
  try {
    const partyId = parseInt(req.params.id);
    const memberId = parseInt(req.params.memberId);
    const { pickupDate } = req.body as { pickupDate: string };
    const member = await prisma.partyMember.findUnique({ where: { id: memberId } });
    if (!member) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }
    await prisma.partyMember.update({
      where: { id: memberId },
      data: { pickupDate: pickupDate ? new Date(pickupDate) : null },
    });
    // Record notification history
    await prisma.notificationHistory.create({
      data: {
        type: 'pickup_ready',
        method: 'sms',
        recipient: '',
        message: `Your garment for party #${partyId} is ready for pickup on ${pickupDate}.`,
        status: 'sent',
        partyId,
      }
    });
    res.json({ ok: true });
  } catch (err: any) {
    logger.error('Error in notifyPickup:', err);
    res.status(500).json({ error: 'Failed to notify pickup.' });
  }
};

/** Communications feed for a party, mapped by member lsCustomerId for UI matching */
export const getPartyCommunications = async (req: Request, res: Response): Promise<void> => {
  try {
    const partyId = parseInt(req.params.id);
    const logs = await prisma.notificationHistory.findMany({
      where: { partyId },
      orderBy: { sentAt: 'desc' },
    });
    const customerIds = Array.from(new Set(logs.map(l => l.customerId).filter(Boolean))) as number[];
    const customers = customerIds.length
      ? await prisma.customer.findMany({ where: { id: { in: customerIds } }, select: { id: true, lightspeedId: true } })
      : [];
    const idToLsId = new Map(customers.map(c => [c.id, c.lightspeedId]));
    const mapped = logs.map(l => ({
      id: l.id,
      type: l.type,
      direction: 'outbound',
      content: l.message,
      sentAt: l.sentAt,
      status: l.status,
      customerId: l.customerId ? idToLsId.get(l.customerId) || null : null,
    }));
    res.json(mapped);
  } catch (err: any) {
    logger.error('Error getting party communications:', err);
    res.status(500).json({ error: 'Failed to get communications.' });
  }
};