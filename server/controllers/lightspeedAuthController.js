const crypto = require('crypto');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const prisma = require('../prismaClient');
const { createLightspeedClient } = require('../lightspeedClient');
const logger = require('../utils/logger');
const querystring = require('querystring');

const { LS_CLIENT_ID, LS_CLIENT_SECRET, LS_REDIRECT_URI, FRONTEND_URL = 'http://localhost:3001', JWT_SECRET, LS_DOMAIN } = process.env;

/**
 * Initiates the Lightspeed OAuth 2.0 authorization flow.
 */
const redirectToLightspeed = (req, res) => {
  try {
    const state = crypto.randomBytes(16).toString('hex');
    req.session.lsAuthState = state;

    // The correct authorization endpoint is the central '/connect' URL, and it does not use 'scope'.
    const authUrl = new URL(`https://secure.retail.lightspeed.app/connect`);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', LS_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', LS_REDIRECT_URI);
    authUrl.searchParams.set('state', state);

    logger.info('Redirecting to Lightspeed for authorization...');
    res.redirect(authUrl.toString());
  } catch (error) {
    logger.error('Error initiating Lightspeed auth redirect:', error);
    res.status(500).send('Failed to start Lightspeed authentication.');
  }
};

/**
 * Handles the OAuth 2.0 callback from Lightspeed.
 */
const handleCallback = async (req, res) => {
  logger.info("Handling Lightspeed callback...");
  const { code, domain_prefix, state, error, error_description, user_id } = req.query;
  const { lsAuthState } = req.session;

  if (error) {
    logger.error('OAuth error in callback:', { error, error_description });
    return res.redirect(`${FRONTEND_URL}/login?error=oauth_error&details=${encodeURIComponent(error_description || 'An error occurred during authorization.')}`);
  }

  if (!state || state !== lsAuthState) {
    logger.error('State mismatch during OAuth callback.', { received: state, expected: lsAuthState });
    return res.redirect(`${FRONTEND_URL}/login?error=state_mismatch`);
  }
  
  if (domain_prefix !== LS_DOMAIN) {
      logger.error('Domain prefix from callback does not match configured LS_DOMAIN.', { received: domain_prefix, expected: LS_DOMAIN });
      return res.redirect(`${FRONTEND_URL}/login?error=domain_mismatch`);
  }

  req.session.lsAuthState = null; // Clear state after use

  try {
    logger.info('Exchanging authorization code for tokens...');
    // The token exchange URL must be specific to the retailer's domain_prefix.
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

    // Save the system-wide token for background services
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
    
    const { user_id } = req.query;
    if (!user_id) {
        logger.error('Lightspeed callback is missing user_id query parameter.');
        const err = new Error('Could not determine user from Lightspeed callback.');
        return res.redirect(`${FRONTEND_URL}/login?error=callback_failed&details=${encodeURIComponent(err.message)}`);
    }
    
    const lightspeedClient = createLightspeedClient(req);
    logger.info(`Fetching user details for user_id: ${user_id}`);
    
    let userResponse;
    try {
        // Correct, documented endpoint is /api/2.0/users/{id}
        userResponse = await lightspeedClient.get(`/users/${user_id}`);
    } catch (error) {
        logger.error(`Failed to fetch user details for ID ${user_id} from Lightspeed.`, { 
            status: error.response?.status,
            data: error.response?.data,
            message: error.message 
        });
        const err = new Error('Could not retrieve user details from Lightspeed. Please ensure the app has permissions to read user data.');
        return res.redirect(`${FRONTEND_URL}/login?error=callback_failed&details=${encodeURIComponent(err.message)}`);
    }
    
    logger.info(`Lightspeed /users/${user_id} response: ${JSON.stringify(userResponse.data)}`);

    // The user data is nested under a 'data' object for a single result.
    const userPayload = userResponse.data.data;

    if (!userPayload || !userPayload.id) {
        logger.error('Failed to parse valid user details from Lightspeed response.', { responseData: userResponse.data });
        const err = new Error('Could not parse user details from Lightspeed response.');
        return res.redirect(`${FRONTEND_URL}/login?error=callback_failed&details=${encodeURIComponent(err.message)}`);
    }

    // Log all available user fields to understand the API response structure
    logger.info(`Available user fields from Lightspeed:`, Object.keys(userPayload));
    logger.info(`User image_source field:`, userPayload.image_source);
    logger.info(`All user image-related fields:`, {
        image_source: userPayload.image_source,
        image: userPayload.image,
        avatar: userPayload.avatar,
        photo: userPayload.photo,
        profile_image: userPayload.profile_image
    });

    const lightspeedId = userPayload.id.toString();
    const name = userPayload.display_name;
    const email = userPayload.email;

    // Determine user role from the user's rights
    const isAdmin = userPayload.account_type === 'admin';
    const role = isAdmin ? 'admin' : 'user';

    logger.info(`Found user: ${name}, Role: ${role}`);

    // Now, find or create a user in our local database.
    let user = await prisma.user.findUnique({
        where: { lightspeedEmployeeId: lightspeedId },
    });

    if (user) {
        logger.info(`User ${user.id} found in local DB. Updating details...`);
        
        // Enhanced photo URL handling
        let photoUrl = userPayload.image_source;
        if (photoUrl && photoUrl.trim() !== '') {
            logger.info(`Syncing photo from Lightspeed: ${photoUrl}`);
        } else {
            logger.info(`No photo available from Lightspeed, keeping existing: ${user.photoUrl || 'none'}`);
            photoUrl = user.photoUrl; // Keep existing photo
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
        
        const photoUrl = userPayload.image_source;
        if (photoUrl && photoUrl.trim() !== '') {
            logger.info(`Setting initial photo from Lightspeed: ${photoUrl}`);
        } else {
            logger.info(`No photo available from Lightspeed for new user`);
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

    logger.info(`Upserted user in local DB: ${user.name} (ID: ${user.id}) with role: ${user.role}`);

    const jwtToken = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.cookie('token', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000,
    });
    
    await new Promise((resolve, reject) => req.session.save(err => err ? reject(err) : resolve()));
    
    logger.info(`User ${user.email} successfully authenticated. Redirecting to frontend.`);
    res.redirect(`${FRONTEND_URL}/`);

  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message;
    logger.error(`Error in Lightspeed token callback handler: ${errorMessage}`, {
        ...(error.response?.data && { data: error.response.data }),
    });
    res.redirect(`${FRONTEND_URL}/login?error=callback_failed&details=${encodeURIComponent(errorMessage)}`);
  }
};

module.exports = {
  redirectToLightspeed,
  handleCallback
}; 