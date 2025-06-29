import { Request, Response } from 'express';
import crypto from 'crypto';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import { createLightspeedClient } from '../lightspeedClient'; // TODO: migrate this as well
import logger from '../utils/logger'; // TODO: migrate this as well
import querystring from 'querystring';

const prisma = new PrismaClient().$extends(withAccelerate());
const LS_CLIENT_ID = process.env.LS_CLIENT_ID || '';
const LS_CLIENT_SECRET = process.env.LS_CLIENT_SECRET || '';
const LS_REDIRECT_URI = process.env.LS_REDIRECT_URI || '';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';
const JWT_SECRET = process.env.JWT_SECRET || '';
const LS_DOMAIN = process.env.LS_DOMAIN || '';

export const redirectToLightspeed = async (req: Request, res: Response): Promise<void> => {
  try {
    const state = crypto.randomBytes(16).toString('hex');
    req.session.lsAuthState = state;
    const authUrl = new URL(`https://secure.retail.lightspeed.app/connect`);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', LS_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', LS_REDIRECT_URI);
    authUrl.searchParams.set('state', state);
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
  req.session.lsAuthState = null;
  try {
    logger.info('Exchanging authorization code for tokens...');
    const tokenResponse = await axios.post(
      `https://${domain_prefix}.retail.lightspeed.app/api/1.0/token`,
      querystring.stringify({
        grant_type: 'authorization_code',
        code: code,
        client_id: LS_CLIENT_ID,
        client_secret: LS_CLIENT_SECRET,
        redirect_uri: LS_REDIRECT_URI,
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
    req.session.lsDomainPrefix = domain_prefix;
    if (!user_id) {
      logger.error('Lightspeed callback is missing user_id query parameter.');
      const err = new Error('Could not determine user from Lightspeed callback.');
      res.redirect(`${FRONTEND_URL}/login?error=callback_failed&details=${encodeURIComponent(err.message)}`);
      return;
    }
    const lightspeedClient = createLightspeedClient(req);
    logger.info(`Fetching user details for user_id: ${user_id}`);
    let userResponse;
    try {
      userResponse = await lightspeedClient.get(`/users/${user_id}`);
      if (!userResponse) throw new Error('No response from Lightspeed');
    } catch (error: any) {
      logger.error(`Failed to fetch user details for ID ${user_id} from Lightspeed.`, { 
        status: error.response?.status,
        data: error.response?.data,
        message: error.message 
      });
      const err = new Error('Could not retrieve user details from Lightspeed. Please ensure the app has permissions to read user data.');
      res.redirect(`${FRONTEND_URL}/login?error=callback_failed&details=${encodeURIComponent(err.message)}`);
      return;
    }
    logger.info(`Lightspeed /users/${user_id} response: ${JSON.stringify(userResponse.data)}`);
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
    const email = userPayload.email;
    const isAdmin = userPayload.account_type === 'admin';
    const role = isAdmin ? 'admin' : 'user';
    logger.info(`Found user: ${name}, Role: ${role}`);
    let user = await prisma.user.findUnique({
      where: { lightspeedEmployeeId: lightspeedId },
    });
    let photoUrl = userPayload.image_source;
    if (user) {
      logger.info(`User ${user.id} found in local DB. Updating details...`);
      if (!photoUrl || photoUrl.trim() === '') {
        photoUrl = user.photoUrl;
      }
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name,
          email,
          role,
          photoUrl,
        },
      });
    } else {
      logger.info(`User with Lightspeed ID ${lightspeedId} not found. Creating new user...`);
      if (!photoUrl || photoUrl.trim() === '') {
        photoUrl = undefined;
      }
      user = await prisma.user.create({
        data: {
          name,
          email,
          lightspeedEmployeeId: lightspeedId,
          role,
          photoUrl,
        },
      });
    }
    // Set user session
    req.session.userId = user.id;
    res.redirect(`${FRONTEND_URL}/`);
    return;
  } catch (error: unknown) {
    let errorMsg = 'Unknown error';
    if (typeof error === 'object' && error && 'message' in error) {
      errorMsg = (error as { message?: string }).message || 'Unknown error';
    }
    logger.error('Error handling Lightspeed callback:', error);
    res.redirect(`${FRONTEND_URL}/login?error=callback_failed&details=${encodeURIComponent(errorMsg)}`);
    return;
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
    const tokenResponse = await axios.post(
      `https://${lsDomainPrefix}.retail.lightspeed.app/api/1.0/token`,
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