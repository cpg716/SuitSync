const prisma = require('../prismaClient');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const {
  FRONTEND_URL = 'http://localhost:3001',
  JWT_SECRET,
} = process.env;

// This is for a local, non-Lightspeed login (e.g., for a super admin)
// Note: The main authentication flow is now the Lightspeed OAuth flow handled by lightspeedAuthController.
exports.login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
        return res.status(401).json({ error: 'Invalid credentials or user does not have a local password.' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
        return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const jwtToken = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.cookie('token', jwtToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 24 * 60 * 60 * 1000,
    });
    
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
};

exports.logout = async (req, res) => {
  res.clearCookie('token', { path: '/' });
  if (req.session) {
    // This will destroy both local and Lightspeed session data
    await new Promise(resolve => req.session.destroy(resolve));
  }
  return res.json({ message: 'Logged out successfully' });
};

exports.getSession = async (req, res) => {
  // req.user is populated by the authMiddleware from the JWT
  if (req.user) {
    try {
      // Fetch the complete user data from database to get latest photoUrl and other fields
      const dbUser = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          photoUrl: true,
          lightspeedEmployeeId: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!dbUser) {
        return res.status(401).json({ error: 'User not found' });
      }

      const lightspeedStatus = {
        connected: !!req.session?.lsAccessToken,
        domain: req.session?.lsDomainPrefix || null,
        lastSync: req.session?.lastLightspeedSync || null
      };
      
      console.log('Session endpoint - User data being returned:', {
        ...dbUser,
        photoUrl: dbUser.photoUrl
      });
      
      // Return the fresh user data from database, and add the lightspeed connection status from session
      res.json({ 
        ...dbUser,
        lightspeed: lightspeedStatus 
      });
    } catch (error) {
      console.error('Error fetching user session data:', error);
      res.status(500).json({ error: 'Failed to fetch user data' });
    }
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
};