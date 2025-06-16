import { sendEmailReminder, sendSmsReminder, getNotificationTemplates, renderTemplate, getReminderIntervals } from '../services/NotificationService';
import prisma from '../../server/prismaClient';
import cron from 'node-cron';

async function sendReminders() {
  const intervals = await getReminderIntervals();
  const templates = await getNotificationTemplates();
  const now = new Date();
  for (const hours of intervals) {
    const target = new Date(now.getTime() + hours * 60 * 60 * 1000);
    const appts = await prisma.appointment.findMany({
      where: {
        dateTime: { gte: target, lte: new Date(target.getTime() + 15 * 60 * 1000) },
        status: { in: ['scheduled', 'rescheduled'] },
      },
      include: { party: { include: { customer: true } } },
    });
    for (const appt of appts) {
      const alreadySent = await prisma.syncLog.findFirst({
        where: {
          appointmentId: appt.id,
          message: { contains: `reminder sent (${hours}h)` },
          createdAt: { gte: new Date(Date.now() - (hours + 1) * 60 * 60 * 1000) },
        },
      });
      if (alreadySent) continue;
      const toEmail = appt.party.customer.email;
      const toPhone = appt.party.customer.phone;
      const vars = {
        customerName: appt.party.customer.name,
        partyName: appt.party.name,
        dateTime: new Date(appt.dateTime).toLocaleString(),
        shopName: process.env.SHOP_NAME || "Riverside Men's Shop",
      };
      if (toEmail) await sendEmailReminder(appt, toEmail, renderTemplate(templates.emailSubject, vars), renderTemplate(templates.emailBody, vars));
      if (toPhone) await sendSmsReminder(appt, toPhone, renderTemplate(templates.smsBody, vars));
      await prisma.syncLog.create({
        data: { appointmentId: appt.id, direction: 'outbound', status: 'success', message: `reminder sent (${hours}h)`, payload: vars }
      });
    }
  }
}

cron.schedule('*/15 * * * *', sendReminders); // every 15 minutes 