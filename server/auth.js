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
  res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
});

// 0b) Logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

// 1) Login redirect (Lightspeed OAuth)
router.get('/ls/login',(req,res)=>{
  const url=new URL('https://cloud.lightspeedapp.com/oauth/authorize');
  url.searchParams.set('client_id',LS_CLIENT_ID);
  url.searchParams.set('redirect_uri',REDIRECT_URI);
  url.searchParams.set('response_type','code');
  url.searchParams.set('scope','sale:read sale:write workflows.rules:write workflows.custom_fields:write');
  res.redirect(url.toString());
});

// 2) Callback exchange
router.get('/ls/callback',async(req,res)=>{
  const code=req.query.code;
  if(!code) return res.status(400).send('No code');
  try {
    const { data } = await axios.post('https://cloud.lightspeedapp.com/oauth/access_token',{
      client_id:LS_CLIENT_ID,
      client_secret:LS_CLIENT_SECRET,
      code,redirect_uri:REDIRECT_URI,grant_type:'authorization_code'
    });
    req.session.lsAccessToken  = data.access_token;
    req.session.lsRefreshToken = data.refresh_token;
    res.send('✅ Authorized!');
  } catch(e){
    console.error(e);
    res.status(500).send('OAuth failed');
  }
});

// Session check endpoint
router.get('/session', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not logged in' });
  const user = await prisma.user.findUnique({
    where: { id: req.session.userId },
    select: { id: true, email: true, name: true, role: true }
  });
  if (!user) return res.status(401).json({ error: 'Not logged in' });
  res.json(user);
});

module.exports = router;