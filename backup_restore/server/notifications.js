const sgMail = require('@sendgrid/mail');
const axios = require('axios');

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const PODIUM_API_KEY = process.env.PODIUM_API_KEY;
const PODIUM_API_URL = process.env.PODIUM_API_URL || 'https://api.podium.com/v4/messages';

// SendGrid factory
function getSendGridClient() {
  if (!SENDGRID_API_KEY) {
    return {
      send: async () => {
        console.warn('SendGrid API key missing, email not sent.');
        return { stub: true };
      }
    };
  }
  sgMail.setApiKey(SENDGRID_API_KEY);
  return sgMail;
}

// Podium/SMS factory
function getPodiumClient() {
  if (!PODIUM_API_KEY) {
    return {
      send: async () => {
        console.warn('Podium API key missing, SMS not sent.');
        return { stub: true };
      }
    };
  }
  return {
    send: async (to, body) => {
      try {
        const res = await axios.post(PODIUM_API_URL, {
          to,
          body
        }, {
          headers: { Authorization: `Bearer ${PODIUM_API_KEY}` }
        });
        return res.data;
      } catch (err) {
        console.error('Podium SMS error:', err);
        throw err;
      }
    }
  };
}

const NotificationService = {
  async sendEmail({ to, subject, text, html }) {
    try {
      const sg = getSendGridClient();
      await sg.send({ to, from: process.env.SENDGRID_FROM || 'noreply@suitsync.com', subject, text, html });
      return { success: true };
    } catch (err) {
      console.error('SendGrid email error:', err);
      return { error: err.message };
    }
  },
  async sendSMS({ to, body }) {
    try {
      const podium = getPodiumClient();
      await podium.send(to, body);
      return { success: true };
    } catch (err) {
      console.error('Podium SMS error:', err);
      return { error: err.message };
    }
  }
};

module.exports = NotificationService;