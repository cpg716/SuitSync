const jwt = require('jsonwebtoken');
const prisma = require('../prismaClient');

const DEMO = process.env.DEMO === 'true';

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
async function authMiddleware(req, res, next) {
  try {
    // Get token from cookie first, then fallback to Authorization header
    let token = req.cookies.token;
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    // console.log('JWT from cookie', token);
    
    // Verify token
    const secret = process.env.SESSION_SECRET;
    // console.log('Using secret:', secret);
    const decoded = jwt.verify(token, secret);
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        lightspeedEmployeeId: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Attach user to request
    req.user = user;

    // Check for Lightspeed token if not in demo mode and if the route requires it
    const requiresLightspeed = ['/api/customers', '/api/sales', '/api/sync'].some(p => req.originalUrl.startsWith(p));
                             
    if (requiresLightspeed && !req.session?.lsAccessToken) {
      return res.status(401).json({ 
        error: 'Lightspeed connection required for this action.',
        errorCode: 'LS_AUTH_REQUIRED',
        redirectTo: '/lightspeed-account'
      });
    }

    return next();
  } catch (err) {
    console.error('Auth error:', err);
    return res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * Authorization middleware
 * Checks if the authenticated user has the 'admin' role.
 * Should be used after authMiddleware.
 */
function requireAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ error: 'Forbidden: Requires admin privileges' });
}

module.exports = {
  authMiddleware,
  requireAdmin,
}; 