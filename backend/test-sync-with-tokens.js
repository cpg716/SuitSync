#!/usr/bin/env node

/**
 * Test Sync with Persistent Tokens
 * 
 * This script tests the sync system directly using the persistent tokens
 * stored in the database.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testSyncWithTokens() {
  console.log('🔧 Testing Sync with Persistent Tokens');
  console.log('=======================================');
  
  try {
    // Check if we have persistent tokens
    const token = await prisma.apiToken.findUnique({
      where: { service: 'lightspeed' }
    });
    
    if (!token || !token.accessToken) {
      console.log('❌ No persistent Lightspeed tokens found');
      console.log('');
      console.log('To fix this:');
      console.log('1. Complete OAuth flow: http://localhost:3000/api/auth/start-lightspeed');
      console.log('2. Or manually store tokens using store-lightspeed-tokens.js');
      return;
    }
    
    console.log('✅ Found persistent tokens');
    console.log(`   Access Token: ${token.accessToken.substring(0, 20)}...`);
    console.log(`   Expires At: ${token.expiresAt}`);
    console.log('');
    
    // Test the sync by making a direct API call
    console.log('🔄 Testing sync via API...');
    
    const response = await fetch('http://localhost:3000/api/sync/customers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `lsAccessToken=${token.accessToken}; lsRefreshToken=${token.refreshToken}; lsDomainPrefix=${process.env.LS_DOMAIN}`
      }
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Sync completed successfully');
      console.log('   Result:', JSON.stringify(result, null, 2));
    } else {
      const error = await response.text();
      console.log('❌ Sync failed');
      console.log('   Status:', response.status);
      console.log('   Error:', error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('   Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  testSyncWithTokens();
}

module.exports = { testSyncWithTokens }; 