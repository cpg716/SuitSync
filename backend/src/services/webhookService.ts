import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import logger from '../utils/logger';
// import { sendNotification } from './NotificationService'; // Uncomment and migrate if needed
import { createLightspeedClient } from '../lightspeedClient';

const prisma = new PrismaClient().$extends(withAccelerate());
const LS_CLIENT_SECRET = process.env.LS_CLIENT_SECRET;

function verifySignature(req: any): boolean {
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

export async function processWebhook(req: any): Promise<void> {
  if (!verifySignature(req)) {
    const error: any = new Error('Invalid webhook signature');
    error.statusCode = 401;
    throw error;
  }
  if (!req.body?.payload) {
    logger.warn('Webhook received without a payload.');
    return;
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
      await handleCustomerUpdate(req, payload);
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

async function handleSaleCompleted(payload: any) {
  const saleData = payload;
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
    const commissionRate = associate.commissionRate || 0;
    const saleTotal = parseFloat(saleData.total);
    const commissionAmount = saleTotal * commissionRate;
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
  } catch (error: any) {
    logger.error(`Failed to process commission for sale ${saleData.id}:`, error);
  }
}

async function handleSaleUpdate(payload: any) {
  logger.info(`Handling sale.update for sale ID: ${payload.id}`);
}

async function handleCustomerUpdate(req: any, payload: any) {
  const customerDataV1 = payload;
  logger.info(`Handling customer.update for customer ID: ${customerDataV1.id}`);
  try {
    const client = createLightspeedClient(req);
    logger.info(`Fetching full v2.0 details for customer ${customerDataV1.id}...`);
    const response = await client.get(`/customers/${customerDataV1.id}`);
    if (!response) throw new Error('No response from Lightspeed');
    const customer: any = response.data.Customer;
    if (!customer) {
      logger.error(`Could not retrieve v2.0 details for customer ${customerDataV1.id}. Aborting update.`);
      return;
    }
    const contact: any = customer.Contact;
    const customerEmail = contact?.Emails?.Email?.[0]?.address;
    const customerPhone = contact?.Phones?.Phone?.[0]?.number;
    const name = `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
    const version = BigInt(customer.version || 0);
    await prisma.customer.upsert({
      where: { lightspeedId: customer.customerID.toString() },
      update: {
        name,
        email: customerEmail,
        phone: customerPhone,
        lightspeedVersion: version,
        syncedAt: new Date(),
      },
      create: {
        lightspeedId: customer.customerID.toString(),
        name,
        email: customerEmail,
        phone: customerPhone,
        lightspeedVersion: version,
        syncedAt: new Date(),
      },
    });
    logger.info(`Successfully upserted customer ${customer.customerID} from webhook notification.`);
  } catch (error: any) {
    logger.error(`Failed to process customer.update webhook for ID ${customerDataV1.id}:`, error.response?.data || error.message);
  }
}

async function handleProductUpdate(payload: any) {
  logger.info(`Handling product.update for product ID: ${payload.id}`);
}

async function handleInventoryUpdate(payload: any) {
  logger.info(`Handling inventory.update for product ID: ${payload.product_id}, outlet ID: ${payload.outlet_id}`);
} 