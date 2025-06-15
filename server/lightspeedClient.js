// server/lightspeedClient.js
const axios = require('axios');
const DEMO = process.env.DEMO === 'true';

// Trim and strip any CR/LF characters
const domain = (process.env.LS_DOMAIN || '').trim().replace(/\r|\n/g, '');
if (!domain) {
  console.error('⚠️  Missing LS_DOMAIN in your .env');
  process.exit(1);
}
if (domain.includes('<') || domain.includes('>')) {
  console.error('⚠️  LS_DOMAIN contains invalid characters. Remove any <>.');
  process.exit(1);
}

/**
 * Creates a Lightspeed API client using the provided access token.
 */
function getLightspeedApi(accessToken) {
  return axios.create({
    baseURL: `https://${domain}.retail.lightspeed.app/api/2.0`,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

/**
 * Exchanges a refresh token for a new access token (and refresh token).
 */
async function refreshAccessToken(refreshToken) {
  const { LS_CLIENT_ID, LS_CLIENT_SECRET, APP_DOMAIN } = process.env;
  const REDIRECT_URI = `https://${APP_DOMAIN}/auth/callback`;
  const resp = await axios.post('https://cloud.lightspeedapp.com/oauth/access_token', {
    client_id:     LS_CLIENT_ID,
    client_secret: LS_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type:    'refresh_token',
    redirect_uri:  REDIRECT_URI,
  });
  return resp.data; // { access_token, refresh_token, ... }
}

/**
 * Wrapper to invoke an API call with automatic token refresh on 401.
 * @param {object} req - The Express request, containing session tokens.
 * @param {(accessToken: string) => Promise<any>} fn - Function making the API call.
 */
async function withTokenRefresh(req, fn) {
  try {
    return await fn(req.session.lsAccessToken);
  } catch (err) {
    if (err.response?.status === 401 && req.session.lsRefreshToken) {
      // Attempt to refresh tokens
      const tokens = await refreshAccessToken(req.session.lsRefreshToken);
      req.session.lsAccessToken  = tokens.access_token;
      req.session.lsRefreshToken = tokens.refresh_token;
      return await fn(req.session.lsAccessToken);
    }
    throw err;
  }
}

/**
 * Creates a custom field in Lightspeed, refreshing tokens if needed.
 * @param {object} req - Express request with session tokens.
 */
async function createCustomField(req, entity, name, title, type) {
  if (DEMO) return null;
  return withTokenRefresh(req, async (accessToken) => {
    const api = getLightspeedApi(accessToken);
    const resp = await api.post('/workflows/custom_fields', { entity, name, title, type });
    return resp.data.customFieldDefinition;
  });
}

/**
 * Creates a business rule in Lightspeed, refreshing tokens if needed.
 * @param {object} req - Express request with session tokens.
 */
async function createBusinessRule(req, eventType, customFieldNames) {
  if (DEMO) return null;
  return withTokenRefresh(req, async (accessToken) => {
    const api = getLightspeedApi(accessToken);
    const resp = await api.post('/workflows/rules', {
      event_type: eventType,
      actions: [
        {
          type: 'require_custom_fields',
          entity: 'line_item',
          required_custom_fields: customFieldNames.map(name => ({ name })),
        },
      ],
    });
    return resp.data.rule;
  });
}

module.exports = {
  getLightspeedApi,
  createCustomField,
  createBusinessRule,
  withTokenRefresh,
};