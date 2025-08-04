import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import logger from '../utils/logger';
import { createLightspeedClient, searchLightspeed } from '../lightspeedClient';
import { getOrCreateSuitSyncPartyField, verifyAndGetCustomField, createOrUpdateCustomField, initialize as initializeWorkflow } from '../services/workflowService';
import { processWebhook } from '../services/webhookService';
import { sendPartyMemberInvitations } from '../services/partyNotificationService';
import { Route, Get, Path, Tags } from 'tsoa';
import { logChange } from '../services/AuditLogService';

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

export const listParties = async (req: Request, res: Response): Promise<void> => {
  try {
    // Fetch local parties
    const parties = await prisma.party.findMany({
      include: {
        members: true,
        _count: {
          select: { members: true }
        }
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
        eventDate: new Date(eventDate),
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
    const { status } = req.body;
    
    const member = await prisma.partyMember.update({
      where: { id: memberId },
      data: { status },
      include: {
        party: true
      }
    });
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