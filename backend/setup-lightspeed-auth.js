#!/usr/bin/env node

/**
 * Lightspeed Authentication Setup Script
 * 
 * This script helps you authenticate with Lightspeed and store persistent tokens
 * for the sync system to work properly.
 */

const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const LS_CLIENT_ID = process.env.LS_CLIENT_ID;
const LS_CLIENT_SECRET = process.env.LS_CLIENT_SECRET;
const LS_DOMAIN = process.env.LS_DOMAIN;
const LS_REDIRECT_URI = process.env.LS_REDIRECT_URI;

async function setupLightspeedAuth() {
  console.log('🔧 Lightspeed Authentication Setup');
  console.log('====================================');
  
  // Check if we already have tokens
  const existingToken = await prisma.apiToken.findUnique({
    where: { service: 'lightspeed' }
  });
  
  if (existingToken && existingToken.accessToken) {
    console.log('✅ Lightspeed tokens already exist in database');
    console.log(`   Access Token: ${existingToken.accessToken.substring(0, 20)}...`);
    console.log(`   Expires At: ${existingToken.expiresAt}`);
    return;
  }
  
  console.log('❌ No Lightspeed tokens found in database');
  console.log('');
  console.log('To authenticate with Lightspeed:');
  console.log('');
  console.log('1. Visit this URL in your browser:');
  console.log(`   http://localhost:3000/api/auth/start-lightspeed`);
  console.log('');
  console.log('2. Complete the OAuth flow with Lightspeed');
  console.log('');
  console.log('3. After successful authentication, the tokens will be stored automatically');
  console.log('');
  console.log('4. Run this script again to verify the tokens are stored');
  console.log('');
  console.log('Environment Variables Check:');
  console.log(`   LS_CLIENT_ID: ${LS_CLIENT_ID ? '✅ Set' : '❌ Missing'}`);
  console.log(`   LS_CLIENT_SECRET: ${LS_CLIENT_SECRET ? '✅ Set' : '❌ Missing'}`);
  console.log(`   LS_DOMAIN: ${LS_DOMAIN ? '✅ Set' : '❌ Missing'}`);
  console.log(`   LS_REDIRECT_URI: ${LS_REDIRECT_URI ? '✅ Set' : '❌ Missing'}`);
  console.log('');
  
  if (!LS_CLIENT_ID || !LS_CLIENT_SECRET || !LS_DOMAIN || !LS_REDIRECT_URI) {
    console.log('❌ Missing required environment variables. Please check your .env file.');
    process.exit(1);
  }
  
  console.log('📋 Next Steps:');
  console.log('1. Open your browser and go to: http://localhost:3000/api/auth/start-lightspeed');
  console.log('2. Log in with your Lightspeed credentials');
  console.log('3. Authorize the application');
  console.log('4. You will be redirected back to the application');
  console.log('5. The tokens will be stored automatically');
  console.log('6. Run this script again to verify');
}

async function checkSyncStatus() {
  console.log('');
  console.log('🔄 Checking Sync Status...');
  
  try {
    const response = await axios.get('http://localhost:3000/api/sync/status');
    console.log('✅ Sync status endpoint is working');
    console.log('   Status:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('❌ Sync status endpoint error:', error.message);
  }
}

async function main() {
  try {
    await setupLightspeedAuth();
    await checkSyncStatus();
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

module.exports = { setupLightspeedAuth, checkSyncStatus }; 