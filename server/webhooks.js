const express = require('express');
const router = express.Router();
const { processWebhook } = require('./services/webhookService');

/**
 * Main route for handling all incoming Lightspeed webhooks.
 * It passes the request to the webhook service for verification and processing.
 */
router.post('/lightspeed', async (req, res) => {
  try {
    await processWebhook(req);
    res.status(200).send('Webhook processed successfully.');
  } catch (err) {
    console.error('Webhook processing failed:', err);
    
    // Send an appropriate status code based on the error
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ error: err.message });
  }
});

/**
 * A simple route to check the sync status from the frontend.
 * This is not a webhook endpoint.
 */
router.get('/sync-status', (req, res) => {
  const isConnected = !!req.session?.lsAccessToken;
  
  if (isConnected) {
    res.json({ 
      status: 'connected', 
      lastSync: new Date().toISOString(), // This is just a placeholder
      domain: req.session.lsDomainPrefix
    });
  } else {
    res.json({ 
      status: 'disconnected', 
      lastSync: null 
    });
  }
});

module.exports = router;
