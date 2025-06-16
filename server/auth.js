// server/auth.js
require('dotenv').config();
const express = require('express');
const axios   = require('axios');
const prisma  = require('./prismaClient');
const bcrypt  = require('bcryptjs'); // For password hashing
const router  = express.Router();

const { LS_CLIENT_ID, LS_CLIENT_SECRET, APP_DOMAIN } = process.env;
const REDIRECT_URI = `https://${APP_DOMAIN}/auth/callback`;

// 0) Session-based login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing credentials' });
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  // For demo: compare plain, but structure for bcrypt
  // const valid = await bcrypt.compare(password, user.passwordHash);
  const valid = password === user.passwordHash;
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
  req.session.userId = user.id;
  console.log('[LOGIN] Set session.userId:', req.session.userId, 'Session:', req.session.id);
  res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
});

// 0b) Logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

// 1) Login redirect (Lightspeed OAuth)
router.get('/ls/login', (req, res) => {
  const url = new URL(`https://${process.env.LS_DOMAIN}.retail.lightspeed.app/oauth/authorize`);
  url.searchParams.set('client_id', process.env.LS_CLIENT_ID);
  url.searchParams.set('redirect_uri', process.env.LS_REDIRECT_URI);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'customer_read sale_read workflow_write');
  res.redirect(url.toString());
});

// 2) Callback exchange
router.get('/ls/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send('No code');
  try {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.LS_CLIENT_ID,
      client_secret: process.env.LS_CLIENT_SECRET,
      redirect_uri: process.env.LS_REDIRECT_URI,
      code,
    });
    const { data } = await axios.post(
      `https://${process.env.LS_DOMAIN}.retail.lightspeed.app/oauth/token`,
      params.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    req.session.lsAccessToken = data.access_token;
    req.session.lsRefreshToken = data.refresh_token;
    res.send('✅ Authorized!');
  } catch (e) {
    console.error(e);
    res.status(500).send('OAuth failed');
  }
});

// Session check endpoint
router.get('/session', async (req, res) => {
  console.log('[SESSION CHECK] Session:', req.session);
  if (!req.session.userId) {
    console.log('[SESSION CHECK] No userId in session');
    return res.status(401).json({ error: 'Not logged in', session: req.session });
  }
  const user = await prisma.user.findUnique({
    where: { id: req.session.userId },
    select: { id: true, email: true, name: true, role: true }
  });
  if (!user) {
    console.log('[SESSION CHECK] No user found for userId:', req.session.userId);
    return res.status(401).json({ error: 'Not logged in', userId: req.session.userId });
  }
  console.log('[SESSION CHECK] Authenticated user:', user);
  res.json(user);
});

// Debug endpoint to dump session
router.get('/debug/session', (req, res) => {
  res.json({ session: req.session });
});

module.exports = router;