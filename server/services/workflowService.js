const lightspeedClient = require('../lightspeedClient');
const logger = require('../utils/logger');

// As per the integration docs, these are the required custom fields.
const REQUIRED_CUSTOM_FIELDS = [
    // For Customer
    { name: 'suitsync_party_id', type: 'string', resource: 'customer', description: 'Links a Lightspeed Customer to a SuitSync Party for event management.' },
    // For Sale
    { name: 'next_fitting_date', type: 'string', resource: 'sale', description: 'The date of the next scheduled fitting appointment for this sale.' }, // Using string for YYYY-MM-DD
    // For Products (used on Sale Line Items for alterations)
    { name: 'alteration_notes', type: 'string', resource: 'product', description: 'Specific notes from the tailor regarding the alteration.' },
    { name: 'tailor_assigned', type: 'string', resource: 'product', description: 'The name or ID of the tailor assigned to this alteration.' },
    { name: 'alteration_status', type: 'string', resource: 'product', description: 'The current stage of the alteration (e.g., pending, in_progress, completed).' }
];

// As per the integration docs, these are the required webhooks.
const REQUIRED_WEBHOOKS = [
    { type: 'sale.update', name: 'SuitSync Sale Updates' },
    { type: 'product.update', name: 'SuitSync Product Updates' }
];

let workflowsInitialized = false;

/**
 * Creates a new custom field in Lightspeed.
 * @param {object} client - An Axios instance for Lightspeed API.
 * @param {object} fieldDef - The definition of the field to create.
 * @returns {Promise<Object>} A promise that resolves to the created custom field definition object.
 */
async function createCustomField(client, fieldDef) {
  try {
    const payload = {
      entity: fieldDef.resource,
      name: fieldDef.name,
      title: fieldDef.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      type: fieldDef.type,
      description: fieldDef.description,
    };
    const response = await client.post('/workflows/custom_fields', payload);
    logger.info(`Successfully created custom field "${fieldDef.name}" for resource "${fieldDef.resource}".`);
    return response.data.data;
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message;
    const statusCode = error.response?.status;

    if (statusCode === 429) {
      logger.error(`[Rate Limit] Could not create custom field "${fieldDef.name}" due to rate limiting. Setup will continue, but this may need to be resolved manually.`);
      return null; // Return null to indicate failure without crashing
    }

    // It's possible the field exists but wasn't found, check for a "has already been taken" error
    if (errorMessage.includes('has already been taken')) {
       logger.warn(`Custom field "${fieldDef.name}" may already exist. Error: ${errorMessage}`);
       // Return a synthetic object so setup can continue
       return { name: fieldDef.name, resource: fieldDef.resource, status: 'assumed_exists' };
    }
    logger.error(`Error creating custom field "${fieldDef.name}" for resource "${fieldDef.resource}":`, errorMessage);
    throw error;
  }
}

/**
 * Verifies a custom field exists, creating it if necessary.
 * @param {object} client - An Axios instance for Lightspeed API.
 * @param {object} fieldDef - The definition of the field to verify.
 * @returns {Promise<Object>} The Lightspeed custom field definition object.
 */
async function verifyAndGetCustomField(client, fieldDef) {
  try {
    logger.info(`Verifying custom field "${fieldDef.name}" for resource "${fieldDef.resource}"...`);
    
    // Fetch all fields for the given entity
    const response = await client.get('/workflows/custom_fields', { params: { entity: fieldDef.resource } });
    const existingFields = Array.isArray(response.data.data) ? response.data.data : [];
    
    let field = existingFields.find(f => f.name === fieldDef.name);

    if (field) {
      logger.info(`Custom field "${fieldDef.name}" found for resource "${fieldDef.resource}".`);
    } else {
      logger.warn(`Custom field "${fieldDef.name}" does not exist for resource "${fieldDef.resource}". Creating it now...`);
      field = await createCustomField(client, fieldDef);
    }

    return field;
  } catch (error) {
    const statusCode = error.response?.status;
    if (statusCode === 429) {
      logger.error(`[Rate Limit] Fatal error verifying custom field "${fieldDef.name}". The server will continue but may not function correctly.`);
      return null; // Do not re-throw, prevent crash
    }
    logger.error(`Fatal error verifying custom field "${fieldDef.name}":`, error.response?.data || error.message);
    // Re-throw to indicate a critical failure in setup
    throw error; 
  }
}

/**
 * Creates a new Webhook subscription in Lightspeed.
 * @param {object} client - An Axios instance for Lightspeed API.
 * @param {object} webhookDef - The definition of the webhook to create.
 * @returns {Promise<Object>} The created webhook object.
 */
async function createWebhook(client, webhookDef) {
    try {
        const payload = {
            type: webhookDef.type,
            active: true, // This field is required by the Lightspeed API
            url: `${process.env.APP_URL}/api/webhooks/lightspeed`
        };
        const response = await client.post('/webhooks', payload);
        logger.info(`Successfully created webhook for "${webhookDef.type}".`);
        return response.data.data;
    } catch (error) {
        const errorMessage = error.response?.data?.message || error.message;
        // The API does not provide a clear "already exists" error, so we rely on careful logging.
        logger.error(`Error creating webhook for "${webhookDef.type}":`, errorMessage, error.response?.data?.fields);
        throw error;
    }
}

/**
 * Verifies a webhook subscription exists, creating it if necessary.
 * @param {object} client - An Axios instance for Lightspeed API.
 * @param {object} webhookDef - The definition of the webhook to verify.
 * @returns {Promise<Object>} The Lightspeed webhook object.
 */
async function verifyWebhook(client, webhookDef) {
    try {
        const targetUrl = `${process.env.APP_URL}/api/webhooks/lightspeed`;
        logger.info(`Verifying webhook for "${webhookDef.type}" to URL ${targetUrl}...`);
        
        const response = await client.get('/webhooks');
        const existingWebhooks = Array.isArray(response.data.data) ? response.data.data : [];
        
        let hook = existingWebhooks.find(h => 
            h.type === webhookDef.type &&
            h.url === targetUrl
        );

        if (hook) {
            logger.info(`Webhook for "${webhookDef.type}" already exists.`);
        } else {
            logger.warn(`Webhook for "${webhookDef.type}" does not exist. Creating it now...`);
            hook = await createWebhook(client, webhookDef);
        }
        return hook;
    } catch (error) {
        logger.error(`Fatal error verifying webhook for "${webhookDef.type}":`, error.response?.data || error.message);
        throw error;
    }
}

/**
 * Creates or updates a custom field in Lightspeed.
 * @param {object} lightspeed - The initialized Lightspeed API client.
 * @param {string} resource - The resource type (e.g., 'customer', 'item').
 * @param {object} fieldDef - The definition of the field to create or update.
 * @returns {Promise<Object>} The created or updated custom field definition object.
 */
async function createOrUpdateCustomField(lightspeed, resource, fieldDef) {
  try {
    const existingField = await verifyAndGetCustomField(lightspeed, fieldDef);
    if (existingField) {
      logger.info(`Custom field "${fieldDef.name}" already exists for resource "${resource}". Updating it...`);
      return await createCustomField(lightspeed, fieldDef);
    } else {
      logger.info(`Custom field "${fieldDef.name}" does not exist for resource "${resource}". Creating it...`);
      return await createCustomField(lightspeed, fieldDef);
    }
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message;
    logger.error(`Error creating or updating custom field "${fieldDef.name}" for resource "${resource}":`, errorMessage);
    throw error;
  }
}

/**
 * Immediately invoked async function to set up the workflows
 */
async function initialize() {
  logger.info('Initializing SuitSync workflow setup in Lightspeed...');

  try {
    const client = lightspeedClient.createLightspeedClient(null);
    if (!client) {
      logger.error('Workflow setup requires an authenticated client. Skipping.');
      return;
    }

    // Verify all custom fields
    for (const fieldDef of REQUIRED_CUSTOM_FIELDS) {
      await verifyAndGetCustomField(client, fieldDef);
    }
    logger.info('All required custom fields verified.');

    // Verify all webhooks
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
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message;
    logger.error('A critical error occurred during Lightspeed workflow setup. The application may not function correctly.', error);
  }
}

module.exports = {
  verifyAndGetCustomField,
  createOrUpdateCustomField,
  initialize,
}; 