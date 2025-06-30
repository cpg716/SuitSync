import { Request, Response } from 'express';
import { sendEmail, sendSMS } from '../services/notificationService';

export const sendEmailNotification = async (req: Request, res: Response): Promise<void> => {
  const { to, subject, text, html } = req.body;
  if (!to || !subject) {
    res.status(400).json({ error: 'Missing to or subject' });
    return;
  }
  const result = await sendEmail({ to, subject, text, html });
  if (result.error) {
    res.status(500).json({ error: result.error });
  } else {
    res.json({ success: true });
  }
};

export const sendSMSNotification = async (req: Request, res: Response): Promise<void> => {
  const { to, body } = req.body;
  if (!to || !body) {
    res.status(400).json({ error: 'Missing to or body' });
    return;
  }
  const result = await sendSMS({ to, body });
  if (result.error) {
    res.status(500).json({ error: result.error });
  } else {
    res.json({ success: true });
  }
}; 