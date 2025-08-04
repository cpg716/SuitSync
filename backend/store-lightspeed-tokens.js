#!/usr/bin/env node

/**
 * Manual Lightspeed Token Storage Script
 * 
 * This script allows you to manually store Lightspeed API tokens
 * for testing the sync system without going through the OAuth flow.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function storeTokens() {
  console.log('🔧 Manual Lightspeed Token Storage');
  console.log('===================================');
  
  // Check if tokens already exist
  const existingToken = await prisma.apiToken.findUnique({
    where: { service: 'lightspeed' }
  });
  
  if (existingToken) {
    console.log('⚠️  Tokens already exist:');
    console.log(`   Access Token: ${existingToken.accessToken.substring(0, 20)}...`);
    console.log(`   Expires At: ${existingToken.expiresAt}`);
    console.log('');
    console.log('Do you want to update them? (y/n)');
    return;
  }
  
  console.log('📝 To store Lightspeed tokens manually:');
  console.log('');
  console.log('1. Get your Lightspeed API tokens from your Lightspeed account');
  console.log('2. Update the tokens in this script');
  console.log('3. Run this script to store them in the database');
  console.log('');
  console.log('Example usage:');
  console.log('   node store-lightspeed-tokens.js');
  console.log('');
  
  // For testing purposes, you can uncomment and modify these lines:
  /*
  const tokens = {
    accessToken: 'your_access_token_here',
    refreshToken: 'your_refresh_token_here',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
  };
  
  await prisma.apiToken.upsert({
    where: { service: 'lightspeed' },
    update: tokens,
    create: {
      service: 'lightspeed',
      ...tokens
    }
  });
  
  console.log('✅ Tokens stored successfully!');
  */
  
  console.log('💡 To enable sync:');
  console.log('1. Edit this script and add your actual tokens');
  console.log('2. Uncomment the token storage code');
  console.log('3. Run this script again');
  console.log('');
  console.log('🔗 Or complete OAuth flow:');
  console.log('   http://localhost:3000/api/auth/start-lightspeed');
}

async function main() {
  try {
    await storeTokens();
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

module.exports = { storeTokens }; 