const crypto = require('crypto');
const prisma = require('../prismaClient');
const logger = require('../utils/logger');
const { sendNotification } = require('./NotificationService');

const { LS_CLIENT_SECRET } = process.env;

/**
 * Verifies the HMAC signature of a Lightspeed webhook request.
 * @param {object} req The Express request object. Must contain `rawBody`.
 * @returns {boolean} True if the signature is valid, false otherwise.
 */
function verifySignature(req) {
  const signatureHeader = req.get('X-Signature');
  
  if (!LS_CLIENT_SECRET) {
    logger.error('CRITICAL: LS_CLIENT_SECRET is not configured. Cannot verify webhook signatures. Rejecting all webhooks.');
    return false;
  }

  if (!signatureHeader) {
    logger.warn('Webhook received without X-Signature header. Rejecting.');
    return false;
  }

  if (!req.rawBody) {
    logger.error('Cannot verify webhook signature: req.rawBody is missing. Ensure express.json is configured with a verify function.');
    return false;
  }

  const signatureMatch = signatureHeader.match(/signature=([^,]+),algorithm=([^,]+)/);
  if (!signatureMatch) {
    logger.warn('Invalid X-Signature header format:', signatureHeader);
    return false;
  }

  const [, signature, algorithm] = signatureMatch;
  
  if (algorithm.toUpperCase() !== 'HMAC-SHA256') {
    logger.warn(`Unsupported webhook signature algorithm: ${algorithm}`);
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', LS_CLIENT_SECRET)
    .update(req.rawBody)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Main entry point for processing a Lightspeed webhook.
 * Verifies the signature and routes to the appropriate handler.
 * @param {object} req The Express request object.
 */
async function processWebhook(req) {
  if (!verifySignature(req)) {
    const error = new Error('Invalid webhook signature');
    error.statusCode = 401;
    throw error;
  }

  // The body is url-encoded, with a 'payload' field containing JSON.
  if (!req.body?.payload) {
    logger.warn('Webhook received without a payload.');
    return; // Or throw an error
  }

  const payload = JSON.parse(req.body.payload);
  const eventType = payload.type;
  
  logger.info(`Processing webhook event: ${eventType}`);

  switch (eventType) {
    case 'sale.update':
    case 'sale.updated':
      await handleSaleUpdate(payload);
      break;
    case 'sale.completed':
      await handleSaleCompleted(payload);
      break;
    case 'customer.update':
    case 'customer.updated':
      await handleCustomerUpdate(payload);
      break;
    case 'product.update':
      await handleProductUpdate(payload);
      break;
    case 'inventory.update':
      await handleInventoryUpdate(payload);
      break;
    default:
      logger.info(`Unhandled webhook event type: ${eventType}`);
  }
}

// --- Event Handlers ---

async function handleSaleCompleted(payload) {
  const saleData = payload; // This is a v2.0 Sale object from the webhook
  logger.info(`Processing completed sale ID: ${saleData.id}`);

  if (!saleData.employee_id) {
    logger.warn(`Sale ${saleData.id} has no employee_id. Cannot assign commission.`);
    return;
  }

  try {
    const associate = await prisma.user.findUnique({
      where: { lightspeedEmployeeId: String(saleData.employee_id) },
    });

    if (!associate) {
      logger.warn(`No associate found with Lightspeed Employee ID ${saleData.employee_id}. Cannot assign commission for sale ${saleData.id}.`);
      return;
    }

    const commissionRate = associate.commissionRate || 0; // Default to 0 if null
    const saleTotal = parseFloat(saleData.total);
    const commissionAmount = saleTotal * commissionRate;

    // Check if an assignment for this sale already exists to prevent duplicates
    const existingAssignment = await prisma.saleAssignment.findFirst({
        where: { saleId: String(saleData.id) }
    });

    if (existingAssignment) {
        logger.info(`Commission for sale ${saleData.id} has already been assigned. Skipping.`);
        return;
    }

    await prisma.saleAssignment.create({
      data: {
        saleId: String(saleData.id),
        associateId: associate.id,
        commissionRate: commissionRate,
        amount: commissionAmount,
      },
    });

    logger.info(`Successfully assigned commission of ${commissionAmount} for sale ${saleData.id} to ${associate.name}.`);

  } catch (error) {
    logger.error(`Failed to process commission for sale ${saleData.id}:`, error);
    // Optionally, re-throw to let the webhook provider know it failed
    // throw error;
  }
}

async function handleSaleUpdate(payload) {
  logger.info(`Handling sale.update for sale ID: ${payload.id}`);
  // As per docs, payload is v1.0. It may be insufficient.
  // For now, we log it. A full implementation would sync with the DB.
  // Example: find a local sale by lightspeedId and update its status.
}

async function handleCustomerUpdate(payload) {
    const customerDataV1 = payload; // Note: This payload is likely v1.0
    logger.info(`Handling customer.update for customer ID: ${customerDataV1.id}`);

    try {
        // const lightspeedClient = require('../lightspeedClient').createLightspeedClient(null);
        
        logger.info(`Fetching full v2.0 details for customer ${customerDataV1.id}...`);
        const { data: customerResponse } = await lightspeedClient.get(`/customers/${customerDataV1.id}`);
        const customerDataV2 = customerResponse.Customer;

        if (!customerDataV2) {
            logger.error(`Could not retrieve v2.0 details for customer ${customerDataV1.id}. Aborting update.`);
            return;
        }

        const customerEmail = customerDataV2.Contact?.Emails?.Email?.[0]?.address;
        const customerPhone = customerDataV2.Contact?.Phones?.Phone?.[0]?.number;
        const name = `${customerDataV2.firstName || ''} ${customerDataV2.lastName || ''}`.trim();
        const version = BigInt(customerDataV2.version || 0);

        await prisma.customer.upsert({
            where: { lightspeedId: customerDataV2.customerID.toString() },
            update: {
                name,
                email: customerEmail,
                phone: customerPhone,
                lightspeedVersion: version,
                syncedAt: new Date(),
            },
            create: {
                lightspeedId: customerDataV2.customerID.toString(),
                name,
                email: customerEmail,
                phone: customerPhone,
                lightspeedVersion: version,
                syncedAt: new Date(),
            },
        });

        logger.info(`Successfully upserted customer ${customerDataV2.customerID} from webhook notification.`);

    } catch (error) {
        logger.error(`Failed to process customer.update webhook for ID ${customerDataV1.id}:`, error.response?.data || error.message);
    }
}

async function handleProductUpdate(payload) {
  logger.info(`Handling product.update for product ID: ${payload.id}`);
  // TODO: Implement logic to create/update product in local DB.
  // Note: Payload is v1.0. May need to fetch v2.0 object for all details.
}

async function handleInventoryUpdate(payload) {
  logger.info(`Handling inventory.update for product ID: ${payload.product_id}, outlet ID: ${payload.outlet_id}`);
  // TODO: Implement logic to update inventory level in local DB.
  // This is crucial for keeping stock levels accurate.
}


module.exports = {
  processWebhook,
}; 