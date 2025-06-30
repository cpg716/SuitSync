import sgMail from '@sendgrid/mail';

const SENDGRID_API_KEY: string = process.env.SENDGRID_API_KEY || '';

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

export const sendEmail = async ({ to, subject, text, html }: { to: string; subject: string; text?: string; html?: string }) => {
  if (!SENDGRID_API_KEY) {
    console.warn('SendGrid API key missing, email not sent.');
    return { error: 'SendGrid API key missing' };
  }
  if (!to) {
    console.warn('Recipient email (to) missing, email not sent.');
    return { error: 'Recipient email (to) missing' };
  }
  if (!text && !html) {
    console.warn('Email must have at least text or html content.');
    return { error: 'Email must have at least text or html content.' };
  }
  const from: string = process.env.SENDGRID_FROM ? process.env.SENDGRID_FROM : 'noreply@suitsync.com';
  const msg: { to: string; from: string; subject: string; text?: string; html?: string } = { to, from, subject };
  if (text) msg.text = text;
  if (html) msg.html = html;
  try {
    await sgMail.send(msg as any);
    return { success: true };
  } catch (err: any) {
    console.error('SendGrid email error:', err);
    return { error: err.message };
  }
};

export const sendSMS = async ({ to, body }: { to: string, body: string }) => {
  // TODO: Implement Podium or Twilio integration
  console.warn('SMS sending not implemented.');
  return { error: 'SMS sending not implemented' };
}; 