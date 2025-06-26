// server/auth.js
require('dotenv').config();
const express = require('express');
const axios   = require('axios');
const prisma  = require('./prismaClient');
const bcrypt  = require('bcryptjs'); // For password hashing
const router  = express.Router();
const jwt = require('jsonwebtoken');

const { LS_CLIENT_ID, LS_CLIENT_SECRET, APP_DOMAIN } = process.env;
const REDIRECT_URI = `https://${APP_DOMAIN}/auth/callback`;

// 0) JWT-based login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing credentials' });
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  // For demo: compare plain, but structure for bcrypt
  // const valid = await bcrypt.compare(password, user.passwordHash);
  const valid = password === user.passwordHash;
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
  // Issue JWT cookie
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
  res.cookie('token', token, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 86400000
  });
  res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
});

// 1) Login redirect (Lightspeed OAuth)
router.get('/ls/login', (req, res) => {
  const url = new URL(`https://${process.env.LS_DOMAIN}.retail.lightspeed.app/oauth/authorize`);
  url.searchParams.set('client_id', process.env.LS_CLIENT_ID);
  url.searchParams.set('redirect_uri', process.env.LS_REDIRECT_URI);
  url.searchParams.set('response_type', 'code');
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

// Debug endpoint to dump session
router.get('/debug/session', (req, res) => {
  res.json({ session: req.session });
});

module.exports = router;