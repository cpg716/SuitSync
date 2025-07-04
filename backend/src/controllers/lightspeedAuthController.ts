import { Request, Response } from 'express';
import crypto from 'crypto';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import { createLightspeedClient } from '../lightspeedClient'; // TODO: migrate this as well
import logger from '../utils/logger'; // TODO: migrate this as well
import querystring from 'querystring';
// import { MultiUserSessionService } from '../services/multiUserSessionService'; // Disabled for pure Lightspeed auth

const prisma = new PrismaClient().$extends(withAccelerate());
const LS_CLIENT_ID = process.env.LS_CLIENT_ID || '';
const LS_CLIENT_SECRET = process.env.LS_CLIENT_SECRET || '';
const LS_REDIRECT_URI = process.env.LS_REDIRECT_URI || '';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';
const JWT_SECRET = process.env.JWT_SECRET || '';
const LS_DOMAIN = process.env.LS_DOMAIN || '';

// Lightspeed OAuth Authorization URL (per official docs, do not change)
const LIGHTSPEED_OAUTH_URL = 'https://secure.retail.lightspeed.app/connect';

/**
 * Map Lightspeed account types to SuitSync roles
 * This provides a default mapping that can be overridden in the admin interface
 */
function mapLightspeedRoleToSuitSync(lightspeedAccountType: string): string {
  switch (lightspeedAccountType?.toLowerCase()) {
    case 'admin':
      return 'admin';
    case 'manager':
      return 'sales_management';
    case 'employee':
    case 'sales':
      return 'sales';
    case 'tailor':
      return 'tailor';
    default:
      // Default to sales for unknown types
      return 'sales';
  }
}

export const redirectToLightspeed = async (req: Request, res: Response): Promise<void> => {
  try {
    const state = crypto.randomBytes(16).toString('hex');
    req.session.lsAuthState = state;
    const authUrl = new URL(LIGHTSPEED_OAUTH_URL);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', LS_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', LS_REDIRECT_URI);
    authUrl.searchParams.set('state', state);
    logger.info(`[OAuth] Using authorization URL: ${authUrl.toString()}`);
    logger.info('Redirecting to Lightspeed for authorization...');
    res.redirect(authUrl.toString());
    return;
  } catch (error) {
    logger.error('Error initiating Lightspeed auth redirect:', error);
    res.status(500).send('Failed to start Lightspeed authentication.');
    return;
  }
};

export const handleCallback = async (req: Request, res: Response): Promise<void> => {
  logger.info("Handling Lightspeed callback...");
  logger.info("Callback query parameters:", req.query);
  logger.info("Session before callback:", req.session);
  const { code, domain_prefix, state, error, error_description, user_id } = req.query as any;
  const { lsAuthState } = req.session;
  if (error) {
    logger.error('OAuth error in callback:', { error, error_description });
    res.redirect(`${FRONTEND_URL}/login?error=oauth_error&details=${encodeURIComponent(error_description || 'An error occurred during authorization.')}`);
    return;
  }
  if (!state || state !== lsAuthState) {
    logger.error('State mismatch during OAuth callback.', { received: state, expected: lsAuthState });
    res.redirect(`${FRONTEND_URL}/login?error=state_mismatch`);
    return;
  }
  if (domain_prefix !== LS_DOMAIN) {
    logger.error('Domain prefix from callback does not match configured LS_DOMAIN.', { received: domain_prefix, expected: LS_DOMAIN });
    res.redirect(`${FRONTEND_URL}/login?error=domain_mismatch`);
    return;
  }
  req.session.lsAuthState = undefined;
  try {
    const tokenUrl = `https://${domain_prefix}.retail.lightspeed.app/api/1.0/token`;
    logger.info('[OAuth] Exchanging code for tokens at', tokenUrl);
    logger.info('[OAuth] Token request params:', { client_id: LS_CLIENT_ID, redirect_uri: LS_REDIRECT_URI, code });
    const tokenResponse = await axios.post(
      tokenUrl,
      querystring.stringify({
        client_id: LS_CLIENT_ID,
        client_secret: LS_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: LS_REDIRECT_URI,
      }),
      { 
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        } 
      }
    );
    logger.info('[OAuth] Token response:', tokenResponse.data);
    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    logger.info(`Successfully obtained tokens. Now attempting to fetch user details for user_id: ${user_id}`);
    const expiresAt = new Date(Date.now() + expires_in * 1000);
    await prisma.apiToken.upsert({
      where: { service: 'lightspeed' },
      update: {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: expiresAt,
      },
      create: {
        service: 'lightspeed',
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: expiresAt,
      },
    });
    req.session.lsAccessToken = access_token;
    req.session.lsRefreshToken = refresh_token;
    req.session.lsDomainPrefix = domain_prefix;
    req.session.lsTokenExpiresAt = expiresAt;
    req.session.userId = user_id;

    if (!user_id) {
      logger.error('Lightspeed callback is missing user_id query parameter.');
      const err = new Error('Could not determine user from Lightspeed callback.');
      res.redirect(`${FRONTEND_URL}/login?error=callback_failed&details=${encodeURIComponent(err.message)}`);
      return;
    }
    const lightspeedClient = createLightspeedClient(req);
    logger.info(`[DEBUG] About to fetch user details: domain=${domain_prefix}, user_id=${user_id}, token=${access_token.slice(0,8)}...`);
    let userResponse;
    try {
      // Fetch the specific user who authenticated using their user_id
      logger.info(`[DEBUG] Requesting: GET https://${domain_prefix}.retail.lightspeed.app/api/2.0/users/${user_id}`);
      userResponse = await lightspeedClient.get(`/users/${user_id}`);
      logger.info(`[DEBUG] User fetch response:`, { status: userResponse.status, data: userResponse.data });
      if (!userResponse) throw new Error('No response from Lightspeed');
    } catch (error: any) {
      logger.error(`[DEBUG] User fetch failed:`, {
        status: error.response?.status,
        data: error.response?.data,
        headers: error.response?.headers,
        message: error.message
      });
      logger.error(`Failed to fetch current user details from Lightspeed.`, {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      const err = new Error('Could not retrieve user details from Lightspeed. Please ensure the app has permissions to read user data.');
      res.redirect(`${FRONTEND_URL}/login?error=callback_failed&details=${encodeURIComponent(err.message)}`);
      return;
    }
    logger.info(`Lightspeed current user response: ${JSON.stringify(userResponse.data)}`);
    let userPayload: any = userResponse.data.data;
    if (
      !userPayload ||
      typeof userPayload !== 'object' ||
      !('id' in userPayload) ||
      !('display_name' in userPayload) ||
      !('email' in userPayload) ||
      !('account_type' in userPayload)
    ) {
      logger.error('Failed to parse valid user details from Lightspeed response.', { responseData: userResponse.data });
      const err = new Error('Could not parse user details from Lightspeed response.');
      res.redirect(`${FRONTEND_URL}/login?error=callback_failed&details=${encodeURIComponent(err.message)}`);
      return;
    }
    const lightspeedId = String(userPayload.id);
    const name = userPayload.display_name;
    // Handle null email from Lightspeed - create a fallback email using username
    const email = userPayload.email || `${userPayload.username}@lightspeed.local`;

    // Map Lightspeed account types to SuitSync roles
    // Default to 'sales' for non-admin users, can be updated in SuitSync admin interface
    const role = mapLightspeedRoleToSuitSync(userPayload.account_type);
    logger.info(`Authenticated Lightspeed user: ${name}, Account Type: ${userPayload.account_type}, SuitSync Role: ${role}`);

    // HYBRID SYSTEM: Create/update local user record with Lightspeed data
    let localUser;
    try {
      // Try to find existing user by Lightspeed ID or email
      localUser = await prisma.user.findFirst({
        where: {
          OR: [
            { lightspeedEmployeeId: lightspeedId },
            { email: email }
          ]
        }
      });

      if (localUser) {
        // Update existing user with latest Lightspeed data
        localUser = await prisma.user.update({
          where: { id: localUser.id },
          data: {
            name,
            email,
            role,
            photoUrl: userPayload.image_source || localUser.photoUrl,
            lightspeedEmployeeId: lightspeedId,
          }
        });
        logger.info(`Updated existing local user ${localUser.id} with Lightspeed data`);
      } else {
        // Create new local user from Lightspeed data
        localUser = await prisma.user.create({
          data: {
            name,
            email,
            role,
            photoUrl: userPayload.image_source || undefined,
            lightspeedEmployeeId: lightspeedId,
            commissionRate: 0.1, // Default commission rate
          }
        });
        logger.info(`Created new local user ${localUser.id} from Lightspeed data`);
      }
    } catch (error) {
      logger.error('Error creating/updating local user:', error);
      // Continue with session-only authentication if database fails
      localUser = null;
    }

    // Create hybrid user object for session
    const lightspeedUser = {
      id: localUser?.id || lightspeedId, // Use local DB ID if available, fallback to Lightspeed ID
      lightspeedId: lightspeedId,
      name,
      email,
      role,
      photoUrl: userPayload.image_source || undefined,
      lightspeedEmployeeId: lightspeedId,
      isLightspeedUser: true,
      hasLocalRecord: !!localUser,
      localUserId: localUser?.id
    };

    logger.info(`Hybrid authentication - ${localUser ? 'with' : 'without'} local user storage`);

    // Store hybrid user and tokens in session
    req.session.lightspeedUser = {
      id: localUser.id,
      name: localUser.name,
      email: localUser.email,
      role: localUser.role,
      photoUrl: localUser.photoUrl,
      lightspeedEmployeeId: localUser.lightspeedEmployeeId,
      isLightspeedUser: true,
      hasLocalRecord: true,
      localUserId: localUser.id
    };
    req.session.userId = localUser.id;
    req.session.activeUserId = localUser.id;
    req.session.lsAccessToken = access_token;
    req.session.lsRefreshToken = refresh_token;
    req.session.lsDomainPrefix = domain_prefix;
    req.session.lsTokenExpiresAt = expiresAt;
    if (!req.session.userSessions) req.session.userSessions = {};
    req.session.userSessions[localUser.id] = {
      lsAccessToken: access_token,
      lsRefreshToken: refresh_token,
      lsDomainPrefix: domain_prefix,
      expiresAt: expiresAt,
      lastActive: new Date(),
      loginTime: new Date()
    };
    logger.info('[Auth] Session fields set for user', { userId: localUser.id });
    await new Promise((resolve, reject) => req.session.save(err => err ? reject(err) : resolve()));
    logger.info('[Auth] Session saved for user', { userId: localUser.id });
    logger.info('[OAuth] Session state after login:', req.session);

    // Check if user needs to set up PIN (first time authentication or no PIN set)
    let needsPinSetup = false;
    if (localUser) {
      const pinInfo = await prisma.user.findUnique({
        where: { id: localUser.id },
        select: { pinHash: true, pinSetAt: true }
      });

      needsPinSetup = !pinInfo?.pinHash;
      logger.info(`User ${localUser.id} PIN setup required: ${needsPinSetup}`);
    }

    // Redirect to appropriate page
    const redirectUrl = needsPinSetup
      ? `${FRONTEND_URL}/setup-pin`
      : `${FRONTEND_URL}/dashboard`;

    res.redirect(redirectUrl);
    return;
  } catch (err) {
    logger.error('Error in handleCallback:', err);
    logger.info("Session after callback error:", req.session);
    res.redirect(`${FRONTEND_URL}/login?error=callback_failed&details=${encodeURIComponent(JSON.stringify(err.response?.data || err.message))}`);
    return;
  }
  logger.info("Session after callback:", req.session);
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { lsAccessToken, lsRefreshToken, lsDomainPrefix } = req.session;
    if (!lsAccessToken || !lsRefreshToken || !lsDomainPrefix) {
      logger.error('Missing required session data for token refresh.');
      return res.status(400).json({ error: 'Missing required session data for token refresh.' });
    }
    logger.info('Refreshing Lightspeed token...');
    const tokenUrl = `https://${lsDomainPrefix}.retail.lightspeed.app/api/1.0/token`;
    const tokenResponse = await axios.post(
      tokenUrl,
      querystring.stringify({
        grant_type: 'refresh_token',
        refresh_token: lsRefreshToken,
        client_id: LS_CLIENT_ID,
        client_secret: LS_CLIENT_SECRET,
      })
    );
    logger.info('Lightspeed token response:', tokenResponse.data);
    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    const expiresAt = new Date(Date.now() + expires_in * 1000);
    await prisma.apiToken.upsert({
      where: { service: 'lightspeed' },
      update: {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: expiresAt,
      },
      create: {
        service: 'lightspeed',
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: expiresAt,
      },
    });
    req.session.lsAccessToken = access_token;
    req.session.lsRefreshToken = refresh_token;
    req.session.lsDomainPrefix = lsDomainPrefix;
    res.status(200).json({ message: 'Lightspeed token refreshed successfully.' });
  } catch (error: unknown) {
    let errorMsg = 'Unknown error';
    if (typeof error === 'object' && error && 'message' in error) {
      errorMsg = (error as { message?: string }).message || 'Unknown error';
    }
    logger.error('Failed to refresh Lightspeed token', { error: errorMsg });
    res.status(500).json({ error: 'Failed to refresh token' });
  }
}; 