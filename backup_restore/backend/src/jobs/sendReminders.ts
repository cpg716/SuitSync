import { sendEmailReminder, sendSmsReminder, getNotificationTemplates, renderTemplate, getReminderIntervals } from '../services/NotificationService';
import prisma from '../../server/prismaClient';
import cron from 'node-cron';

const STAFF_EMAIL = process.env.STAFF_EMAIL || 'admin@demo.com';
const REMINDER_DAYS = [7, 3, 1]; // days before appt/event
const ESCALATE_DAYS = 60; // days before event to check for measured

async function sendAppointmentReminders() {
  const now = new Date();
  const parties = await prisma.party.findMany({
    include: {
      members: true,
      appointments: true,
      customer: true,
    },
  });
  for (const party of parties) {
    // Event reminders
    for (const days of REMINDER_DAYS) {
      const eventDiff = (new Date(party.eventDate).getTime() - now.getTime()) / (1000*60*60*24);
      if (eventDiff > days-1 && eventDiff <= days) {
        // Remind main customer
        const msg = `Reminder: Your event "${party.name}" is in ${days} day(s) on ${new Date(party.eventDate).toLocaleDateString()}.`;
        if (party.customer?.email) await sendEmailReminder({ customerId: party.customer.id, partyId: party.id, id: 0 }, party.customer.email, 'Event Reminder', msg);
        if (party.customer?.phone) await sendSmsReminder({ customerId: party.customer.id, partyId: party.id, id: 0 }, party.customer.phone, msg);
      }
    }
    // Appointment reminders
    for (const appt of party.appointments) {
      for (const days of REMINDER_DAYS) {
        const apptDiff = (new Date(appt.dateTime).getTime() - now.getTime()) / (1000*60*60*24);
        if (apptDiff > days-1 && apptDiff <= days) {
          // Remind member (if available)
          const member = party.members.find(m => m.id === appt.memberId);
          if (member && member.lsCustomerId) {
            const customer = await prisma.customer.findUnique({ where: { id: Number(member.lsCustomerId) } });
            const msg = `Reminder: Your ${appt.type} appointment for "${party.name}" is in ${days} day(s) on ${new Date(appt.dateTime).toLocaleString()}.`;
            if (customer?.email) await sendEmailReminder({ customerId: customer.id, partyId: party.id, id: appt.id }, customer.email, 'Appointment Reminder', msg);
            if (customer?.phone) await sendSmsReminder({ customerId: customer.id, partyId: party.id, id: appt.id }, customer.phone, msg);
          }
        }
      }
    }
    // Escalation: not all measured X days before event
    const eventDiff = (new Date(party.eventDate).getTime() - now.getTime()) / (1000*60*60*24);
    if (eventDiff <= ESCALATE_DAYS && party.members.some(m => m.status !== 'Measured')) {
      // Flag as at risk
      await prisma.party.update({ where: { id: party.id }, data: { notes: '[AT RISK] Not all members measured.' } });
      // Notify staff
      const msg = `ALERT: Party "${party.name}" (event ${new Date(party.eventDate).toLocaleDateString()}) is at risk: not all members measured.`;
      await sendEmailReminder({ customerId: 0, partyId: party.id, id: 0 }, STAFF_EMAIL, 'Party At Risk', msg);
    }
  }
}

// Schedule to run daily at 8am
cron.schedule('0 8 * * *', async () => {
  await sendAppointmentReminders();
  console.log('Daily reminders and escalations sent.');
});

// For manual run
if (require.main === module) {
  sendAppointmentReminders().then(() => {
    console.log('Reminders/escalations complete.');
    process.exit(0);
  });
} 