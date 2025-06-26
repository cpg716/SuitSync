import nodemailer from 'nodemailer';
import twilio from 'twilio';
import prisma from '../../server/prismaClient';

const sendgridUser = process.env.SENDGRID_USER;
const sendgridPass = process.env.SENDGRID_PASS;
const twilioSid = process.env.TWILIO_SID;
const twilioToken = process.env.TWILIO_TOKEN;
const twilioFrom = process.env.TWILIO_FROM;
const shopName = process.env.SHOP_NAME || "Riverside Men's Shop";

const transporter = nodemailer.createTransport({
  service: 'SendGrid',
  auth: { user: sendgridUser, pass: sendgridPass },
});

const twilioClient = twilio(twilioSid, twilioToken);

export function renderTemplate(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] || '');
}

export async function getNotificationTemplates() {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  return {
    emailSubject: settings?.emailSubject || 'Reminder: Your appointment at {shopName}',
    emailBody: settings?.emailBody || 'Hi {customerName},\nThis is a reminder for your appointment with {partyName} on {dateTime}.',
    smsBody: settings?.smsBody || 'Reminder: {partyName} appointment on {dateTime} at {shopName}.',
  };
}

export async function getReminderIntervals() {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  if (settings?.reminderIntervals) {
    return settings.reminderIntervals.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
  }
  return [24, 4];
}

export async function sendEmailReminder(appointment, to, subject, text) {
  try {
    await transporter.sendMail({ from: sendgridUser, to, subject, text });
    await prisma.syncLog.create({
      data: { appointmentId: appointment.id, direction: 'outbound', status: 'success', message: 'Email reminder sent', payload: { to, subject, text } }
    });
    // Log to CommunicationLog
    await prisma.communicationLog.create({
      data: {
        customerId: appointment.customerId ? Number(appointment.customerId) : null,
        partyId: appointment.partyId || null,
        type: 'Email',
        direction: 'Outbound',
        content: text,
        sentAt: new Date(),
        status: 'Sent',
      }
    });
  } catch (err) {
    await prisma.syncLog.create({
      data: { appointmentId: appointment.id, direction: 'outbound', status: 'failed', message: err.message, payload: { to, subject, text } }
    });
    // Log to CommunicationLog (failed)
    await prisma.communicationLog.create({
      data: {
        customerId: appointment.customerId ? Number(appointment.customerId) : null,
        partyId: appointment.partyId || null,
        type: 'Email',
        direction: 'Outbound',
        content: text,
        sentAt: new Date(),
        status: 'Failed',
      }
    });
    throw err;
  }
}

export async function sendSmsReminder(appointment, to, body) {
  try {
    await twilioClient.messages.create({ from: twilioFrom, to, body });
    await prisma.syncLog.create({
      data: { appointmentId: appointment.id, direction: 'outbound', status: 'success', message: 'SMS reminder sent', payload: { to, body } }
    });
    // Log to CommunicationLog
    await prisma.communicationLog.create({
      data: {
        customerId: appointment.customerId ? Number(appointment.customerId) : null,
        partyId: appointment.partyId || null,
        type: 'SMS',
        direction: 'Outbound',
        content: body,
        sentAt: new Date(),
        status: 'Sent',
      }
    });
  } catch (err) {
    await prisma.syncLog.create({
      data: { appointmentId: appointment.id, direction: 'outbound', status: 'failed', message: err.message, payload: { to, body } }
    });
    // Log to CommunicationLog (failed)
    await prisma.communicationLog.create({
      data: {
        customerId: appointment.customerId ? Number(appointment.customerId) : null,
        partyId: appointment.partyId || null,
        type: 'SMS',
        direction: 'Outbound',
        content: body,
        sentAt: new Date(),
        status: 'Failed',
      }
    });
    throw err;
  }
} 