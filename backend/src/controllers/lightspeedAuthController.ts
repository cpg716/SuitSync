import { Request, Response } from 'express';
import axios from 'axios';
import querystring from 'querystring';
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import { createLightspeedClient } from '../lightspeedClient';
import logger from '../utils/logger';
import { PersistentUserSessionService } from '../services/persistentUserSessionService';

const prisma = new PrismaClient().$extends(withAccelerate());

const LS_CLIENT_ID = process.env.LS_CLIENT_ID!;
const LS_CLIENT_SECRET = process.env.LS_CLIENT_SECRET!;
const LS_DOMAIN = process.env.LS_DOMAIN!;
const LS_REDIRECT_URI = process.env.LS_REDIRECT_URI!;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';

function mapLightspeedRoleToSuitSync(lightspeedAccountType: string): string {
  // Map Lightspeed account types to SuitSync roles
  const roleMap: { [key: string]: string } = {
    'admin': 'admin',
    'manager': 'manager',
    'sales': 'sales',
    'tailor': 'tailor',
    'associate': 'sales',
    'employee': 'sales'
  };
  
  return roleMap[lightspeedAccountType.toLowerCase()] || 'sales';
}

export const redirectToLightspeed = async (req: Request, res: Response): Promise<void> => {
  const state = Math.random().toString(36).substring(7);
  req.session.lsAuthState = state;
  
  const authUrl = `https://secure.retail.lightspeed.app/connect?response_type=code&client_id=${LS_CLIENT_ID}&redirect_uri=${encodeURIComponent(LS_REDIRECT_URI)}&state=${state}`;
  
  logger.info(`Redirecting to Lightspeed OAuth: ${authUrl}`);
  res.redirect(authUrl);
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
    const tokenUrl = `https://${domain_prefix}.retail.lightspeed.app/oauth/token`;
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
    
    // Store tokens in ApiToken table for sync operations
    let tokenRow;
    try {
      tokenRow = await prisma.apiToken.upsert({
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
      logger.info('[OAuth] Successfully upserted Lightspeed token in apiToken table:', tokenRow);
    } catch (upsertError) {
      logger.error('[OAuth] Failed to upsert Lightspeed token in apiToken table:', upsertError);
      res.redirect(`${FRONTEND_URL}/login?error=token_upsert_failed&details=${encodeURIComponent(upsertError instanceof Error ? upsertError.message : String(upsertError))}`);
      return;
    }

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

    // Create persistent user session
    try {
      const userAgent = req.headers['user-agent'] || 'unknown';
      const deviceType = userAgent.includes('Mobile') ? 'mobile' as const : 
                        userAgent.includes('Tablet') ? 'tablet' as const : 'desktop' as const;
      
      const deviceInfo = {
        userAgent,
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
        deviceType
      };

      const userSessionData = {
        lightspeedUserId: lightspeedId,
        lightspeedEmployeeId: lightspeedId,
        email: email,
        name: name,
        role: role,
        photoUrl: userPayload.photo_url || undefined,
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: expiresAt,
        domainPrefix: domain_prefix
      };

      const persistentSession = await PersistentUserSessionService.createOrUpdateSession(userSessionData, deviceInfo);
      logger.info(`Created persistent session for user: ${name} (${lightspeedId})`);

      // Set session data for current browser session
      req.session.lsAccessToken = access_token;
      req.session.lsRefreshToken = refresh_token;
      req.session.lsDomainPrefix = domain_prefix;
      req.session.lsTokenExpiresAt = expiresAt;
      req.session.userId = user_id;
      req.session.lightspeedUser = {
        id: lightspeedId,
        lightspeedId: lightspeedId,
        email: email,
        name: name,
        role: role,
        lightspeedEmployeeId: lightspeedId,
        photoUrl: userPayload.photo_url || undefined,
        hasLocalRecord: false,
        localUserId: null
      };

      // Redirect to success page
      res.redirect(`${FRONTEND_URL}/dashboard?auth=success&user=${encodeURIComponent(name)}`);

    } catch (sessionError) {
      logger.error('Failed to create persistent session:', sessionError);
      res.redirect(`${FRONTEND_URL}/login?error=session_creation_failed&details=${encodeURIComponent(sessionError instanceof Error ? sessionError.message : String(sessionError))}`);
      return;
    }

  } catch (error: any) {
    logger.error('OAuth callback error:', error);
    res.redirect(`${FRONTEND_URL}/login?error=callback_failed&details=${encodeURIComponent(error.message)}`);
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { lsAccessToken, lsRefreshToken, lsDomainPrefix } = req.session;
    if (!lsAccessToken || !lsRefreshToken || !lsDomainPrefix) {
      logger.error('Missing required session data for token refresh.');
      return res.status(400).json({ error: 'Missing required session data for token refresh.' });
    }
    logger.info('Refreshing Lightspeed token...');
    const tokenUrl = `https://${lsDomainPrefix}.retail.lightspeed.app/oauth/token`;
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