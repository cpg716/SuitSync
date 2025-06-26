// server/lightspeedClient.js
const axios = require('axios');
const DEMO = process.env.DEMO === 'true';

const LS_DOMAIN = process.env.LS_DOMAIN;
const LS_CLIENT_ID = process.env.LIGHTSPEED_CLIENT_ID || process.env.LS_CLIENT_ID;
const LS_CLIENT_SECRET = process.env.LIGHTSPEED_CLIENT_SECRET || process.env.LS_CLIENT_SECRET;
const LS_REDIRECT_URI = process.env.LS_REDIRECT_URI;
const LS_API_BASE = `https://${LS_DOMAIN}.retail.lightspeed.app/api/2.0`;

function getAccessTokenFromSession(req) {
  return req.session?.lsAccessToken;
}

function getRefreshTokenFromSession(req) {
  return req.session?.lsRefreshToken;
}

const api = axios.create({
  baseURL: LS_API_BASE,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Request interceptor: inject Authorization
api.interceptors.request.use(
  (config) => {
    if (config.req && getAccessTokenFromSession(config.req)) {
      config.headers['Authorization'] = `Bearer ${getAccessTokenFromSession(config.req)}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: on 401, try refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response && error.response.status === 401 && !originalRequest._retry && originalRequest.req) {
      originalRequest._retry = true;
      try {
        const refreshToken = getRefreshTokenFromSession(originalRequest.req);
        const tokenRes = await axios.post(
          `https://${LS_DOMAIN}.retail.lightspeed.app/oauth/token`,
          new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: LS_CLIENT_ID,
            client_secret: LS_CLIENT_SECRET,
            redirect_uri: LS_REDIRECT_URI,
            refresh_token: refreshToken,
          }),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        // Update session tokens
        originalRequest.req.session.lsAccessToken = tokenRes.data.access_token;
        originalRequest.req.session.lsRefreshToken = tokenRes.data.refresh_token;
        // Retry original request
        originalRequest.headers['Authorization'] = `Bearer ${tokenRes.data.access_token}`;
        return api(originalRequest);
      } catch (refreshErr) {
        console.error('Lightspeed token refresh failed:', refreshErr);
        return Promise.reject(refreshErr);
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Creates a custom field in Lightspeed, refreshing tokens if needed.
 * @param {object} req - Express request with session tokens.
 */
async function createCustomField(req, entity, fieldData) {
  if (DEMO) return null;
  try {
    const res = await api.post(`/workflows/custom_fields`, fieldData, { req });
    return res.data;
  } catch (err) {
    console.error('Error creating custom field:', err);
    throw err;
  }
}

/**
 * Creates a business rule in Lightspeed, refreshing tokens if needed.
 * @param {object} req - Express request with session tokens.
 */
async function createBusinessRule(req, ruleData) {
  if (DEMO) return null;
  try {
    const res = await api.post(`/workflows/business_rules`, ruleData, { req });
    return res.data;
  } catch (err) {
    console.error('Error creating business rule:', err);
    throw err;
  }
}

module.exports = { api, createCustomField, createBusinessRule };