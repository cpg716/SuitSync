import { Request, Response } from 'express';
import axios from 'axios';
import querystring from 'querystring';
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import { createLightspeedClient } from '../lightspeedClient';
import logger from '../utils/logger';
import { PersistentUserSessionService } from '../services/persistentUserSessionService';
import { UserSyncService } from '../services/userSyncService';



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
  // Generate a simple, reliable state parameter
  const state = Math.random().toString(36).substring(2, 15); // 13 characters
  
  req.session.lsAuthState = state;
  
  // Use secure connect endpoint (minimal, proven working)
  const authUrl = `https://secure.retail.lightspeed.app/connect?response_type=code&client_id=${LS_CLIENT_ID}&redirect_uri=${encodeURIComponent(LS_REDIRECT_URI)}&state=${state}`;

  logger.info(`Redirecting to Lightspeed Connect with state: ${state}`);
  res.redirect(authUrl);
};

export const handleCallback = async (req: Request, res: Response): Promise<void> => {
  console.log("=== handleCallback START ===");
  console.log("=== CALLBACK FUNCTION CALLED ===");
  console.log("Query params:", req.query);
  console.log("Session:", req.session);
  logger.info("Handling Lightspeed callback...");
  logger.info("Callback query parameters:", req.query);
  logger.info("Session before callback:", req.session);
  const { code, domain_prefix, state, error, error_description } = req.query as any;
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
    console.log("=== About to exchange token ===");
    const tokenUrl = `https://${domain_prefix}.retail.lightspeed.app/api/1.0/token`;
    logger.info('[OAuth] Exchanging code for tokens at', tokenUrl);
    logger.info('[OAuth] Token request params:', { 
      client_id: LS_CLIENT_ID, 
      redirect_uri: LS_REDIRECT_URI, 
      code: code,
      domain_prefix: domain_prefix
    });
    
    let tokenResponse;
    try {
      tokenResponse = await axios.post(
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
    } catch (error: any) {
      logger.error('[OAuth] Token exchange failed:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });

      // Handle rate limiting specifically
      if (error.response?.status === 429) {
        logger.warn('Lightspeed OAuth token exchange rate limit exceeded.');
        const retryAfterHeader = error.response.headers['retry-after'];
        let retryAfterSeconds = 60; // Default to 60 seconds

        if (retryAfterHeader) {
          // Try to parse as number first (seconds)
          const numericRetryAfter = parseInt(retryAfterHeader);
          if (!isNaN(numericRetryAfter)) {
            retryAfterSeconds = numericRetryAfter;
          } else {
            // Try to parse as date
            const retryDate = new Date(retryAfterHeader);
            if (!isNaN(retryDate.getTime())) {
              retryAfterSeconds = Math.max(Math.ceil((retryDate.getTime() - Date.now()) / 1000), 1);
            }
          }
        }

        const err = new Error(`Lightspeed OAuth rate limit exceeded. Please wait ${retryAfterSeconds} seconds and try again.`);
        res.redirect(`${FRONTEND_URL}/login?error=rate_limit&retry_after=${retryAfterSeconds}&details=${encodeURIComponent(err.message)}`);
        return;
      }

      res.redirect(`${FRONTEND_URL}/login?error=token_exchange_failed&details=${encodeURIComponent(error.response?.data?.error_description || error.message)}`);
      return;
    }
    logger.info('[OAuth] Token response status:', tokenResponse.status);
    logger.info('[OAuth] Token response headers:', tokenResponse.headers);
    logger.info('[OAuth] Token response data:', tokenResponse.data);
    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    
    // Validate that we received the required tokens
    if (!access_token || !refresh_token || !expires_in) {
      logger.error('[OAuth] Missing required tokens from Lightspeed response:', {
        hasAccessToken: !!access_token,
        hasRefreshToken: !!refresh_token,
        hasExpiresIn: !!expires_in,
        responseData: tokenResponse.data
      });
      res.redirect(`${FRONTEND_URL}/login?error=token_exchange_failed&details=${encodeURIComponent('Failed to obtain access token from Lightspeed')}`);
      return;
    }
    
    logger.info(`Successfully obtained tokens. Now attempting to fetch current user details`);
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

    // Get the current user by making an API call with the access token
    const lightspeedClient = createLightspeedClient(req);
    logger.info(`[DEBUG] About to fetch current user details: domain=${domain_prefix}, token=${access_token.slice(0,8)}...`);
    let userResponse;
    try {
      // Fetch all users and find the current user (for OAuth, we'll use the first admin user as fallback)
      logger.info(`[DEBUG] Requesting: GET https://${domain_prefix}.retail.lightspeed.app/api/2.0/users`);
      userResponse = await lightspeedClient.get(`/users`);
      logger.info(`[DEBUG] User fetch response:`, { status: userResponse.status, data: userResponse.data });
      if (!userResponse) throw new Error('No response from Lightspeed');
    } catch (error: any) {
      logger.error(`[DEBUG] User fetch failed:`, {
        status: error.response?.status,
        data: error.response?.data,
        headers: error.response?.headers,
        message: error.message
      });

      // Handle rate limiting specifically
      if (error.response?.status === 429) {
        logger.warn('Lightspeed API rate limit exceeded during authentication. User will need to retry.');
        const retryAfterHeader = error.response.headers['retry-after'];
        let retryAfterSeconds = 60; // Default to 60 seconds

        if (retryAfterHeader) {
          // Try to parse as number first (seconds)
          const numericRetryAfter = parseInt(retryAfterHeader);
          if (!isNaN(numericRetryAfter)) {
            retryAfterSeconds = numericRetryAfter;
          } else {
            // Try to parse as date
            const retryDate = new Date(retryAfterHeader);
            if (!isNaN(retryDate.getTime())) {
              retryAfterSeconds = Math.max(Math.ceil((retryDate.getTime() - Date.now()) / 1000), 1);
            }
          }
        }

        const err = new Error(`Lightspeed API rate limit exceeded. Please wait ${retryAfterSeconds} seconds and try again.`);
        res.redirect(`${FRONTEND_URL}/login?error=rate_limit&retry_after=${retryAfterSeconds}&details=${encodeURIComponent(err.message)}`);
        return;
      }

      logger.error(`Failed to fetch current user details from Lightspeed.`, {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      const err = new Error('Could not retrieve user details from Lightspeed. Please ensure the app has permissions to read user data.');
      res.redirect(`${FRONTEND_URL}/login?error=callback_failed&details=${encodeURIComponent(err.message)}`);
      return;
    }
    logger.info(`Lightspeed users response: ${JSON.stringify(userResponse.data)}`);
    const users = userResponse.data.data || [];
    
    if (!Array.isArray(users) || users.length === 0) {
      logger.error('No users found in Lightspeed response.', { responseData: userResponse.data });
      const err = new Error('No users found in Lightspeed account.');
      res.redirect(`${FRONTEND_URL}/login?error=callback_failed&details=${encodeURIComponent(err.message)}`);
      return;
    }
    
    // Find the primary user (is_primary_user: true) or the first admin user
    let userPayload = users.find((user: any) => user.is_primary_user) || 
                     users.find((user: any) => user.account_type === 'admin') || 
                     users[0];
    
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
    // Robust photo resolution across LS fields
    const resolvedPhotoUrl = userPayload.image_source || userPayload.photo_url || userPayload.avatar || undefined;

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
        lightspeedUserId: lightspeedId, // Keep for interface compatibility
        lightspeedEmployeeId: lightspeedId,
        email: email,
        name: name,
        role: role,
        photoUrl: resolvedPhotoUrl,
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
      // Note: user_id will be set after we fetch the user details
      req.session.lightspeedUser = {
        id: lightspeedId,
        lightspeedId: lightspeedId,
        email: email,
        name: name,
        role: role,
        lightspeedEmployeeId: lightspeedId,
        photoUrl: resolvedPhotoUrl,
        hasLocalRecord: false,
        localUserId: null
      };

      // Immediately sync all Lightspeed users into local DB so lists are complete
      try {
        logger.info('[OAuth] Triggering full user sync after login...');
        const syncResult = await UserSyncService.syncAllUsers(req as any);
        logger.info(`[OAuth] User sync completed: created=${syncResult.created}, updated=${syncResult.updated}, errors=${syncResult.errors}`);
      } catch (syncErr) {
        logger.error('[OAuth] User sync failed after login (continuing anyway):', syncErr);
      }

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

// Development endpoint for testing Lightspeed API connection
export const testLightspeedConnection = async (req: Request, res: Response): Promise<void> => {
  try {
    logger.info('[DEV] Testing Lightspeed API connection...');
    
    // Check if we have a valid session
    const hasLsSession = !!req.session?.lightspeedUser;
    if (!hasLsSession) {
      res.status(401).json({ 
        error: 'No Lightspeed session found. Please log in through the frontend first.',
        instructions: '1. Go to /login 2. Click "Sign in with Lightspeed" 3. Complete OAuth flow 4. Then test this endpoint again'
      });
      return;
    }

    // Test the connection using existing session
    const client = createLightspeedClient(req);
    
    // Test basic API call
    logger.info('[DEV] Testing basic API call...');
    const usersResponse = await client.get('/users');
    
    if (usersResponse && usersResponse.data) {
      const users = usersResponse.data.data || [];
      logger.info(`[DEV] Successfully connected to Lightspeed API. Found ${users.length} users.`);
      
      res.json({
        success: true,
        message: `Successfully connected to Lightspeed API`,
        userCount: users.length,
        currentUser: req.session.lightspeedUser,
        sampleUsers: users.slice(0, 3).map((u: any) => ({
          id: u.id,
          name: u.display_name,
          email: u.email,
          role: u.account_type
        }))
      });
    } else {
      res.status(500).json({ 
        error: 'API call succeeded but returned unexpected data format',
        response: usersResponse?.data 
      });
    }
    
  } catch (error: any) {
    logger.error('[DEV] Lightspeed API test failed:', error);
    res.status(500).json({ 
      error: 'Failed to connect to Lightspeed API',
      details: error.message,
      instructions: 'Check your OAuth credentials and ensure the Lightspeed app is properly configured'
    });
  }
}; 