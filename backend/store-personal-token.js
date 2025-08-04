#!/usr/bin/env node

/**
 * Store Personal Access Token Script
 * 
 * This script stores the Lightspeed Personal Access Token as persistent tokens
 * for the sync system to use.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function storePersonalToken() {
  console.log('🔧 Storing Personal Access Token');
  console.log('================================');
  
  const personalToken = process.env.LS_PERSONAL_ACCESS_TOKEN;
  const domain = process.env.LS_DOMAIN;
  
  if (!personalToken) {
    console.log('❌ LS_PERSONAL_ACCESS_TOKEN not found in environment');
    console.log('');
    console.log('Please set LS_PERSONAL_ACCESS_TOKEN in your .env file');
    return;
  }
  
  if (!domain) {
    console.log('❌ LS_DOMAIN not found in environment');
    console.log('');
    console.log('Please set LS_DOMAIN in your .env file');
    return;
  }
  
  console.log(`✅ Found Personal Access Token: ${personalToken.substring(0, 20)}...`);
  console.log(`✅ Domain: ${domain}`);
  console.log('');
  
  try {
    // Store the personal access token as persistent tokens
    const tokenRow = await prisma.apiToken.upsert({
      where: { service: 'lightspeed' },
      update: {
        accessToken: personalToken,
        refreshToken: personalToken, // Personal tokens don't expire, so use same as refresh
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      },
      create: {
        service: 'lightspeed',
        accessToken: personalToken,
        refreshToken: personalToken,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      },
    });
    
    console.log('✅ Successfully stored Personal Access Token as persistent tokens');
    console.log(`   Token ID: ${tokenRow.id}`);
    console.log(`   Access Token: ${tokenRow.accessToken.substring(0, 20)}...`);
    console.log(`   Expires At: ${tokenRow.expiresAt}`);
    console.log('');
    
    // Verify the token was stored
    const storedToken = await prisma.apiToken.findUnique({
      where: { service: 'lightspeed' }
    });
    
    if (storedToken) {
      console.log('✅ Verification: Token successfully stored in database');
      console.log('');
      console.log('🔄 Now you can test the sync system:');
      console.log('   curl -X POST http://localhost:3000/api/sync/customers');
      console.log('');
    } else {
      console.log('❌ Verification failed: Token not found in database');
    }
    
  } catch (error) {
    console.error('❌ Failed to store Personal Access Token:', error.message);
    console.error('   Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  storePersonalToken();
}

module.exports = { storePersonalToken }; 