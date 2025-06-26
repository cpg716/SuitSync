// server/lightspeedClient.js
const axios = require('axios');
const querystring = require('querystring');
const logger = require('./utils/logger');
// Note: We no longer import from './config' to avoid load order issues.
// Variables are accessed directly from process.env when needed.

function getLightspeedOauthUrl(domain) {
  if (!domain) return '';
  if (domain.includes('.retail.lightspeed.app')) {
    return `https://${domain}`;
  }
  return `https://${domain}.retail.lightspeed.app`;
}

/**
 * Fetches all items from a paginated Lightspeed API endpoint.
 * This function must be bound to an Axios instance to have the correct `this` context.
 * @param {string} endpoint - The API endpoint to fetch from (e.g., '/customers').
 * @param {object} [initialParams={}] - Optional initial query parameters.
 * @returns {Promise<Array>} A promise that resolves to an array of all items.
 */
async function fetchAllWithPagination(endpoint, initialParams = {}) {
  const client = this;
  let allItems = [];
  let after = initialParams.after || null;
  const limit = 100; // Lightspeed's max limit is 100
  let hasMore = true;

  while (hasMore) {
    try {
      const { data } = await client.get(endpoint, {
        params: { ...initialParams, after, limit },
      });

      // Find the key for the array of results in the response (e.g., 'Customer', 'Product')
      const arrayKey = Object.keys(data).find(k => Array.isArray(data[k]));
      const items = arrayKey ? data[arrayKey] : [];

      if (items.length > 0) {
        allItems = allItems.concat(items);

        // Lightspeed's cursor pagination works by continuing as long as a full page is returned.
        // If we get fewer items than the limit, it's the last page.
        if (items.length === limit) {
          // The 'after' cursor for the next page is the 'version' of the last item.
          const lastItem = items[items.length - 1];
          if (lastItem && lastItem.version) {
            after = lastItem.version;
            hasMore = true;
          } else {
            // If for some reason there's no version on the last item, we must stop.
            logger.warn(`[fetchAllWithPagination] Last item on full page for ${endpoint} has no version. Stopping pagination.`, { lastItem });
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      } else {
        // No items were returned, so we are done.
        hasMore = false;
      }
    } catch (error) {
      logger.error(`Error during paginated fetch for ${endpoint}:`, {
        message: error.response?.data?.message || error.message,
        endpoint,
        params: { ...initialParams, after },
      });
      hasMore = false; // Stop on error
    }
  }
  logger.info(`Finished paginated fetch for ${endpoint}. Found ${allItems.length} items.`);
  return allItems;
}

/**
 * Creates a configured Axios instance for making API calls to Lightspeed.
 * This function handles two scenarios:
 * 1. System-level client (no session): Uses a long-lived Personal Access Token for startup/background tasks.
 * 2. User-level client (with session): Uses the standard OAuth 2.0 flow with token refresh.
 *
 * @param {object} req - The request object, containing session and other information. Can be null for system-level clients.
 * @returns {object} An Axios instance with interceptors and helpers.
 */
function createLightspeedClient(req) {
  const session = req?.session; // Safely access session
  let client;
  const domain = session?.lsDomainPrefix || process.env.LS_DOMAIN;

  if (!domain) {
    const errorMessage = 'Lightspeed client requires a domain. Check session or .env variables (LS_DOMAIN).';
    logger.error(`FATAL: ${errorMessage}`);
    throw new Error(errorMessage);
  }
  
  // A token is not required for the initial authorization steps
  // but will be for most subsequent calls.
  
  const baseURL = `${getLightspeedOauthUrl(domain)}/api/2.0`;

  client = axios.create({
    baseURL: baseURL,
    headers: {
      'User-Agent': 'SuitSync/1.0 (https://suitsync.app; mailto:support@suitsync.app)',
    }
  });

  // Use a request interceptor to add the token and User-Agent to every request
  client.interceptors.request.use(config => {
    // Set a proper User-Agent header as recommended by Lightspeed
    config.headers['User-Agent'] = 'SuitSync/1.0 (https://suitsync.app; mailto:support@suitsync.app)';
    
    // Re-read access token from session before each request for user-level clients,
    // or use the personal token for system-level clients.
    const currentToken = session?.lsAccessToken || process.env.LS_PERSONAL_ACCESS_TOKEN;
    if (currentToken) {
      config.headers['Authorization'] = `Bearer ${currentToken}`;
    }
    return config;
  }, error => {
    return Promise.reject(error);
  });

  // Add a response interceptor for handling API rate limiting (429)
  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const { config, response } = error;
      if (!response || response.status !== 429 || !config) {
        return Promise.reject(error);
      }

      // Implement exponential backoff
      const backoff = new Promise(resolve => {
        const retryAfter = response.headers['retry-after'] ? parseInt(response.headers['retry-after'], 10) * 1000 : 0;
        const backoffTime = retryAfter || (2 ** (config.retryCount || 0)) * 1000;
        setTimeout(resolve, backoffTime);
      });

      config.retryCount = (config.retryCount || 0) + 1;
      
      // Stop after a few retries
      if (config.retryCount > 5) {
        logger.error('Lightspeed API rate limit exceeded. Max retries reached.');
        return Promise.reject(error);
      }

      await backoff;
      return client(config);
    }
  );

  // Only add the refresh interceptor if we are in a user context (we have a req, a session, and a refresh token)
  if (req && session?.lsRefreshToken) {
    client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (error.response.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          try {
            logger.info('Lightspeed token expired. Refreshing...');
            // The refresh URL must use the /api/1.0/token endpoint, not /oauth/token
            const refreshUrl = `https://${session.lsDomainPrefix}.retail.lightspeed.app/api/1.0/token`;
            const tokenResponse = await axios.post(
              refreshUrl,
              querystring.stringify({
                grant_type: 'refresh_token',
                client_id: process.env.LS_CLIENT_ID,
                client_secret: process.env.LS_CLIENT_SECRET,
                refresh_token: session.lsRefreshToken, // Use session here, which is safe
              }),
              { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
            );

            // Update session with new tokens
            session.lsAccessToken = tokenResponse.data.access_token;
            session.lsRefreshToken = tokenResponse.data.refresh_token;
            
            // Persist the updated session
            await new Promise((resolve, reject) => {
              req.session.save(err => { // req.session is safe due to the outer if
                if (err) {
                  logger.error('Failed to save session after token refresh:', { error: err });
                  return reject(err);
                }
                logger.info('Session saved successfully after token refresh.');
                resolve();
              });
            });
            
            // Update the header of the original request and retry
            originalRequest.headers['Authorization'] = `Bearer ${session.lsAccessToken}`;
            return client(originalRequest);

          } catch (refreshError) {
            const errorData = refreshError.response?.data;
            logger.error('Failed to refresh Lightspeed token:', { error: errorData || refreshError.message });
            
            // If refresh fails, the user needs to re-authenticate.
            // Destroy the session to log them out.
            await new Promise(resolve => req.session.destroy(resolve)); // req.session is safe

            // We can't redirect from the client, but rejecting will propagate the error
            // to the frontend, which should then handle the redirect to the login page.
            return Promise.reject(refreshError);
          }
        }
        return Promise.reject(error);
      }
    );
  }

  client.fetchAllWithPagination = fetchAllWithPagination.bind(client);
  return client;
}

/**
 * Searches for customers in Lightspeed using the /search endpoint.
 * @param {object} client - An initialized lightspeedClient (Axios instance).
 * @param {object} searchParams - The search parameters (e.g., { email: 'test@example.com' }).
 * @returns {Promise<Array>} A promise that resolves to an array of matching customer objects.
 */
async function searchLightspeed(client, resource, searchParams) {
  try {
    const { data } = await client.get('/search', {
      params: searchParams,
    });

    // The response for a search call has a structure like { Customer: [...] }
    const resourceKey = Object.keys(data).find(
      key => key.toLowerCase() === resource.toLowerCase()
    );

    if (resourceKey && Array.isArray(data[resourceKey])) {
      return data[resourceKey];
    }
    
    // It's also possible the results are nested under a 'results' object
    // And the resource is a property on each item.
    if (data.results && Array.isArray(data.results)) {
      return data.results.filter(r => r.resource === resource);
    }

    // Fallback for cases where the structure is different or empty
    return [];
  } catch (error) {
    logger.error(`Error searching Lightspeed for ${resource}`, {
        params: searchParams,
        error: error.response?.data || error.message,
    });
    throw error; // Re-throw to be handled by the caller
  }
}

module.exports = { createLightspeedClient, getLightspeedOauthUrl, searchLightspeed };