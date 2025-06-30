import { createLightspeedClient } from '../lightspeedClient';
import logger from '../utils/logger';

const REQUIRED_CUSTOM_FIELDS = [
  { name: 'suitsync_party_id', type: 'string', resource: 'customer', description: 'Links a Lightspeed Customer to a SuitSync Party for event management.' },
  { name: 'next_fitting_date', type: 'string', resource: 'sale', description: 'The date of the next scheduled fitting appointment for this sale.' },
  { name: 'alteration_notes', type: 'string', resource: 'product', description: 'Specific notes from the tailor regarding the alteration.' },
  { name: 'tailor_assigned', type: 'string', resource: 'product', description: 'The name or ID of the tailor assigned to this alteration.' },
  { name: 'alteration_status', type: 'string', resource: 'product', description: 'The current stage of the alteration (e.g., pending, in_progress, completed).' }
];

const REQUIRED_WEBHOOKS = [
  { type: 'sale.update', name: 'SuitSync Sale Updates' },
  { type: 'product.update', name: 'SuitSync Product Updates' }
];

let workflowsInitialized = false;

async function createCustomField(client: any, fieldDef: any): Promise<any> {
  try {
    const payload = {
      entity: fieldDef.resource,
      name: fieldDef.name,
      title: fieldDef.name.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
      type: fieldDef.type,
      description: fieldDef.description,
    };
    const response = await client.post('/workflows/custom_fields', payload);
    logger.info(`Successfully created custom field "${fieldDef.name}" for resource "${fieldDef.resource}".`);
    return response.data.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message;
    const statusCode = error.response?.status;
    if (statusCode === 429) {
      logger.error(`[Rate Limit] Could not create custom field "${fieldDef.name}" due to rate limiting. Setup will continue, but this may need to be resolved manually.`);
      return null;
    }
    if (errorMessage.includes('has already been taken')) {
      logger.warn(`Custom field "${fieldDef.name}" may already exist. Error: ${errorMessage}`);
      return { name: fieldDef.name, resource: fieldDef.resource, status: 'assumed_exists' };
    }
    logger.error(`Error creating custom field "${fieldDef.name}" for resource "${fieldDef.resource}":`, errorMessage);
    throw error;
  }
}

export async function verifyAndGetCustomField(client: any, fieldDef: any): Promise<any> {
  try {
    logger.info(`Verifying custom field "${fieldDef.name}" for resource "${fieldDef.resource}"...`);
    const response = await client.get('/workflows/custom_fields', { params: { entity: fieldDef.resource } });
    if (!response) throw new Error('No response from Lightspeed');
    const existingFields = Array.isArray(response.data.data) ? response.data.data : [];
    let field = existingFields.find((f: any) => f.name === fieldDef.name);
    if (field) {
      logger.info(`Custom field "${fieldDef.name}" found for resource "${fieldDef.resource}".`);
    } else {
      logger.warn(`Custom field "${fieldDef.name}" does not exist for resource "${fieldDef.resource}". Creating it now...`);
      field = await createCustomField(client, fieldDef);
    }
    return field;
  } catch (error: any) {
    const statusCode = error.response?.status;
    if (statusCode === 429) {
      logger.error(`[Rate Limit] Fatal error verifying custom field "${fieldDef.name}". The server will continue but may not function correctly.`);
      return null;
    }
    logger.error(`Fatal error verifying custom field "${fieldDef.name}":`, error.response?.data || error.message);
    throw error;
  }
}

async function createWebhook(client: any, webhookDef: any): Promise<any> {
  try {
    const payload = {
      type: webhookDef.type,
      active: true,
      url: `${process.env.APP_URL}/api/webhooks/lightspeed`
    };
    const response = await client.post('/webhooks', payload);
    logger.info(`Successfully created webhook for "${webhookDef.type}".`);
    return response.data.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message;
    logger.error(`Error creating webhook for "${webhookDef.type}": ${errorMessage}`, error.response?.data?.fields);
    throw error;
  }
}

async function verifyWebhook(client: any, webhookDef: any): Promise<any> {
  try {
    const targetUrl = `${process.env.APP_URL}/api/webhooks/lightspeed`;
    logger.info(`Verifying webhook for "${webhookDef.type}" to URL ${targetUrl}...`);
    const response = await client.get('/webhooks');
    if (!response) throw new Error('No response from Lightspeed');
    const existingWebhooks = Array.isArray(response.data.data) ? response.data.data : [];
    let hook = existingWebhooks.find((h: any) => h.type === webhookDef.type && h.url === targetUrl);
    if (hook) {
      logger.info(`Webhook for "${webhookDef.type}" already exists.`);
    } else {
      logger.warn(`Webhook for "${webhookDef.type}" does not exist. Creating it now...`);
      hook = await createWebhook(client, webhookDef);
    }
    return hook;
  } catch (error: any) {
    logger.error(`Fatal error verifying webhook for "${webhookDef.type}":`, error.response?.data || error.message);
    throw error;
  }
}

export async function createOrUpdateCustomField(lightspeed: any, resource: string, fieldDef: any): Promise<any> {
  try {
    const existingField = await verifyAndGetCustomField(lightspeed, fieldDef);
    if (existingField) {
      logger.info(`Custom field "${fieldDef.name}" already exists for resource "${resource}". Updating it...`);
      return await createCustomField(lightspeed, fieldDef);
    } else {
      logger.info(`Custom field "${fieldDef.name}" does not exist for resource "${resource}". Creating it...`);
      return await createCustomField(lightspeed, fieldDef);
    }
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message;
    logger.error(`Error creating or updating custom field "${fieldDef.name}" for resource "${resource}":`, errorMessage);
    throw error;
  }
}

export async function initialize(req: any): Promise<void> {
  logger.info('Initializing SuitSync workflow setup in Lightspeed...');
  try {
    const client = createLightspeedClient(req);
    if (!client) {
      logger.error('Workflow setup requires an authenticated client. Skipping.');
      return;
    }
    for (const fieldDef of REQUIRED_CUSTOM_FIELDS) {
      await verifyAndGetCustomField(client, fieldDef);
    }
    logger.info('All required custom fields verified.');
    if (!process.env.APP_URL) {
      logger.warn('APP_URL environment variable is not set. Skipping webhook setup.');
      return;
    }
    for (const webhookDef of REQUIRED_WEBHOOKS) {
      await verifyWebhook(client, webhookDef);
    }
    logger.info('All required webhooks verified.');
    logger.info('Workflow setup complete.');
    workflowsInitialized = true;
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message;
    logger.error('A critical error occurred during Lightspeed workflow setup. The application may not function correctly.', error);
  }
}

export async function getOrCreateSuitSyncPartyField() {
  return { id: 1 };
}

export async function getOrCreateSuitSyncAppointmentsField() {
  return { id: 1 };
} 