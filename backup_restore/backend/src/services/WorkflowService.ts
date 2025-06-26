import prisma from '../../server/prismaClient';
import { sendEmailReminder, sendSmsReminder } from './NotificationService';

export class WorkflowService {
  // Start the party workflow (e.g., after party creation)
  static async startPartyWorkflow(partyId: number) {
    // Optionally, set initial statuses or schedule first appointments
    // ...
  }

  // Advance a member's status in the workflow
  static async advanceMemberStatus(memberId: number, newStatus: string) {
    const member = await prisma.partyMember.update({
      where: { id: memberId },
      data: { status: newStatus },
    });
    // Automation: check for bulk order or all ready
    await WorkflowService.checkAndTriggerBulkOrder(member.partyId);
    await WorkflowService.checkAndNotifyAllReady(member.partyId);
  }

  // Trigger bulk suit order for a party
  static async triggerBulkOrder(partyId: number) {
    // Find all measured members
    const members = await prisma.partyMember.findMany({
      where: { partyId, status: 'Measured' },
    });
    // Mark party as ordered, or create order records
    // ...
  }

  // Schedule a fitting appointment for a member
  static async scheduleFitting(memberId: number, dateTime: Date) {
    const member = await prisma.partyMember.findUnique({ where: { id: memberId } });
    if (!member) throw new Error('Member not found');
    await prisma.appointment.create({
      data: {
        partyId: member.partyId,
        memberId: member.id,
        dateTime,
        type: 'fitting',
        status: 'scheduled',
      },
    });
  }

  // Notify customer that suit is ready for pickup
  static async notifyReadyForPickup(memberId: number, pickupDate: Date) {
    const member = await prisma.partyMember.findUnique({
      where: { id: memberId },
      include: { party: true },
    });
    if (!member) throw new Error('Member not found');
    // Fetch customer contact info (assuming lsCustomerId maps to Customer)
    const customer = await prisma.customer.findUnique({ where: { id: Number(member.lsCustomerId) } });
    if (!customer) throw new Error('Customer not found');
    const message = `Your suit for ${member.party?.name} is ready for pickup on ${pickupDate.toLocaleDateString()}.`;
    if (customer.email) {
      await sendEmailReminder({ customerId: customer.id, partyId: member.partyId, id: 0 }, customer.email, 'Suit Ready for Pickup', message);
    }
    if (customer.phone) {
      await sendSmsReminder({ customerId: customer.id, partyId: member.partyId, id: 0 }, customer.phone, message);
    }
  }

  static async checkAndTriggerBulkOrder(partyId: number) {
    const members = await prisma.partyMember.findMany({ where: { partyId } });
    if (members.length > 0 && members.every(m => m.status === 'Measured')) {
      await WorkflowService.triggerBulkOrder(partyId);
      await prisma.party.update({ where: { id: partyId }, data: { notes: 'Bulk order auto-triggered.' } });
    }
  }

  static async checkAndNotifyAllReady(partyId: number) {
    const members = await prisma.partyMember.findMany({ where: { partyId } });
    if (members.length > 0 && members.every(m => m.status === 'Ready')) {
      const party = await prisma.party.findUnique({ where: { id: partyId }, include: { customer: true } });
      if (party?.customer?.email) {
        await sendEmailReminder({ customerId: party.customer.id, partyId, id: 0 }, party.customer.email, 'All Suits Ready', `All suits for your party "${party.name}" are ready for pickup.`);
      }
      if (party?.customer?.phone) {
        await sendSmsReminder({ customerId: party.customer.id, partyId, id: 0 }, party.customer.phone, `All suits for your party "${party.name}" are ready for pickup.`);
      }
    }
  }
} 