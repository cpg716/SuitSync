import express from 'express';
import { processWebhook } from '../services/webhookService';
import { asyncHandler } from '../utils/asyncHandler';
import logger from '../utils/logger';

const router = express.Router();

/**
 * Main route for handling all incoming Lightspeed webhooks.
 * Processes webhook events and updates local data accordingly.
 */
router.post('/lightspeed', asyncHandler(async (req: any, res) => {
  try {
    logger.info('Received Lightspeed webhook', {
      headers: {
        'x-signature': req.get('X-Signature'),
        'content-type': req.get('Content-Type'),
        'user-agent': req.get('User-Agent')
      },
      bodyKeys: Object.keys(req.body || {})
    });

    await processWebhook(req);
    
    logger.info('Webhook processed successfully');
    res.status(200).json({ status: 'success', message: 'Webhook processed successfully' });
  } catch (error: any) {
    logger.error('Webhook processing failed:', {
      error: error.message,
      stack: error.stack,
      statusCode: error.statusCode
    });
    
    // Send appropriate status code based on the error
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ 
      status: 'error', 
      error: error.message 
    });
  }
}));

/**
 * Health check endpoint for webhook service
 */
router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    service: 'webhook',
    timestamp: new Date().toISOString()
  });
});

export default router;
