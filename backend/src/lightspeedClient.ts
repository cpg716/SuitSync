import axios, { AxiosInstance, AxiosError } from 'axios';
import querystring from 'querystring';
import { MultiUserSessionService } from './services/multiUserSessionService';
import { lightspeedCircuitBreaker } from './services/circuitBreaker';
import { PrismaClient } from '@prisma/client';

// Rate limiting helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Exponential backoff for rate limiting
const handleRateLimit = async (error: any, retryCount: number = 0): Promise<void> => {
  if (error.response?.status === 429 && retryCount < 3) {
    const retryAfter = error.response.headers['retry-after'];
    let waitTime = 1000 * Math.pow(2, retryCount); // Exponential backoff: 1s, 2s, 4s

    if (retryAfter) {
      // If Retry-After header is present, use it
      const retryDate = new Date(retryAfter);
      if (!isNaN(retryDate.getTime())) {
        waitTime = Math.max(retryDate.getTime() - Date.now(), waitTime);
      }
    }

    console.warn(`Rate limited. Waiting ${waitTime}ms before retry ${retryCount + 1}/3`);
    await delay(waitTime);
    return;
  }
  throw error; // Re-throw if not rate limit or max retries exceeded
};

const prisma = new PrismaClient();

async function getPersistentToken() {
  // Always fetch the latest token for service 'lightspeed'
  const token = await prisma.apiToken.findUnique({ where: { service: 'lightspeed' } });
  return token;
}

async function getDomainPrefix(req: any) {
  if (req?.session?.lsDomainPrefix) return req.session.lsDomainPrefix;
  if (req._lightspeedTokenCache) return process.env.LS_DOMAIN || null;
  // No domain in session, fallback to env
  return process.env.LS_DOMAIN || null;
}

async function getAccessToken(req: any) {
  if (req?.session?.lsAccessToken) return req.session.lsAccessToken;
  if (req._lightspeedTokenCache) return req._lightspeedTokenCache.accessToken;
  // Fallback: load from DB
  const token = await getPersistentToken();
  if (token) {
    req._lightspeedTokenCache = token;
    return token.accessToken;
  }
  return null;
}

async function getRefreshToken(req: any) {
  if (req?.session?.lsRefreshToken) return req.session.lsRefreshToken;
  if (req._lightspeedTokenCache) return req._lightspeedTokenCache.refreshToken;
  // Fallback: load from DB
  const token = await getPersistentToken();
  if (token) {
    req._lightspeedTokenCache = token;
    return token.refreshToken;
  }
  return null;
}

async function refreshAccessToken(req: any) {
  const domainPrefix = await getDomainPrefix(req);
  const refreshToken = await getRefreshToken(req);
  const LS_CLIENT_ID = process.env.LS_CLIENT_ID || '';
  const LS_CLIENT_SECRET = process.env.LS_CLIENT_SECRET || '';
  if (!domainPrefix || !refreshToken) throw new Error('Missing domain or refresh token for Lightspeed refresh');
  const tokenUrl = `https://${domainPrefix}.retail.lightspeed.app/oauth/token`;
  const response = await axios.post(
    tokenUrl,
    querystring.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: LS_CLIENT_ID,
      client_secret: LS_CLIENT_SECRET,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  // Update both legacy session and multi-user session cache
  if (req.session) {
    req.session.lsAccessToken = response.data.access_token;
    req.session.lsRefreshToken = response.data.refresh_token;
  }
  // Update persistent token in DB
  await prisma.apiToken.upsert({
    where: { service: 'lightspeed' },
    update: {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresAt: new Date(Date.now() + (response.data.expires_in * 1000)),
    },
    create: {
      service: 'lightspeed',
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresAt: new Date(Date.now() + (response.data.expires_in * 1000)),
    },
  });
  // Update cache
  req._lightspeedTokenCache = {
    accessToken: response.data.access_token,
    refreshToken: response.data.refresh_token,
    expiresAt: new Date(Date.now() + (response.data.expires_in * 1000)),
  };
  return response.data.access_token;
}

function createAxiosInstanceSync(accessToken: string, domainPrefix: string): AxiosInstance {
  if (!accessToken) throw new Error('No Lightspeed access token');
  if (!domainPrefix) throw new Error('No Lightspeed domain prefix');
  console.info(`[LightspeedClient] Using domain: ${domainPrefix}, token: ${accessToken.slice(0, 8)}...`);
  return axios.create({
    baseURL: `https://${domainPrefix}.retail.lightspeed.app/api/2.0`,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  });
}

export function createLightspeedClient(req: any) {
  let client: AxiosInstance;
  let initialized = false;

  async function ensureClient() {
    if (!initialized) {
      const accessToken = await getAccessToken(req);
      const domainPrefix = await getDomainPrefix(req);
      client = createAxiosInstanceSync(accessToken, domainPrefix);
      initialized = true;
    }
  }

  async function requestWithRefresh(method: string, endpoint: string, data?: any, params?: any, retryCount: number = 0): Promise<any> {
    await ensureClient();
    return await lightspeedCircuitBreaker.execute(async () => {
      try {
        let response;
        if (method === 'get') {
          response = await client.get(endpoint, { params });
        } else if (method === 'post') {
          response = await client.post(endpoint, data);
        } else if (method === 'put') {
          response = await client.put(endpoint, data);
        }
        // Log rate limit headers for monitoring
        if (response?.headers['x-ratelimit-remaining']) {
          const remaining = response.headers['x-ratelimit-remaining'];
          const limit = response.headers['x-ratelimit-limit'];
          console.debug(`Rate limit: ${remaining}/${limit} remaining`);
        }
        return response;
      } catch (error) {
        const err = error as AxiosError;
        // Handle rate limiting with exponential backoff
        if (err.response?.status === 429) {
          try {
            await handleRateLimit(err, retryCount);
            return await requestWithRefresh(method, endpoint, data, params, retryCount + 1);
          } catch (rateLimitError) {
            throw rateLimitError;
          }
        }
        if (err.response?.status === 401 && !req._retry) {
          req._retry = true;
          const newToken = await refreshAccessToken(req);
          client = createAxiosInstanceSync(newToken, await getDomainPrefix(req)); // update client with new token
          if (method === 'get') {
            return await client.get(endpoint, { params });
          } else if (method === 'post') {
            return await client.post(endpoint, data);
          } else if (method === 'put') {
            return await client.put(endpoint, data);
          }
        }
        throw error;
      }
    });
  }

  // Proper pagination implementation following Lightspeed API 2.0 cursor-based pagination
  const fetchAllWithPagination = async (endpoint: string, initialParams: any = {}): Promise<any[]> => {
    let allItems: any[] = [];
    let after = initialParams.after || 0;
    let hasMore = true;

    while (hasMore) {
      try {
        const params = { ...initialParams, after };
        const response = await requestWithRefresh('get', endpoint, undefined, params);
        if (!response) throw new Error('No response from Lightspeed');

        const { data } = response;
        const items = data.data || data; // Handle both {data: [...]} and [...] responses

        if (Array.isArray(items) && items.length > 0) {
          allItems = allItems.concat(items);

          // Check if we have version info for cursor pagination
          if (data.version && data.version.max) {
            after = data.version.max;
            // If we got fewer items than expected, we're likely on the last page
            hasMore = items.length >= 100; // Lightspeed default page size
          } else if (items.length > 0 && items[items.length - 1].version) {
            // Fallback: use version from last item
            after = items[items.length - 1].version;
            hasMore = items.length >= 100;
          } else {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      } catch (error: any) {
        console.error(`Error during paginated fetch for ${endpoint}:`, {
          message: error.response?.data?.message || error.message,
          endpoint,
          params: { ...initialParams, after },
        });
        throw error; // Re-throw to let caller handle
      }
    }

    console.info(`Finished paginated fetch for ${endpoint}. Found ${allItems.length} items.`);
    return allItems;
  };

  return {
    get: (endpoint: string, params?: any) => requestWithRefresh('get', endpoint, undefined, params),
    post: (endpoint: string, data: any) => requestWithRefresh('post', endpoint, data),
    put: (endpoint: string, data: any) => requestWithRefresh('put', endpoint, data),
    fetchAllWithPagination,
    getCustomers: async () => {
      return await fetchAllWithPagination('/customers');
    },
  };
}

export async function searchLightspeed(client: any, resource: string, query: any) {
  const { data } = await client.get(`/${resource}`, { params: query });
  return data;
}

export async function setCustomFieldValue(_session: any, _payload: any) {
  return {};
}

export async function createServiceOrder(_session: any, _payload: any) {
  return { data: { service_order: { id: 1 } } };
} 