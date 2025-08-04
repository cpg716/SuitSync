#!/usr/bin/env node

/**
 * Direct Sync Test Script
 * 
 * This script tests the sync system directly without going through
 * the authentication middleware to isolate sync issues.
 */

const { PrismaClient } = require('@prisma/client');
const { syncCustomers, syncSales, syncUsers } = require('./dist/services/syncService');

const prisma = new PrismaClient();

async function testSyncDirect() {
  console.log('🔧 Testing Sync System Directly');
  console.log('================================');
  
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
    
    // Create a mock request object for the sync service
    const mockReq = {
      session: {
        lsAccessToken: token.accessToken,
        lsRefreshToken: token.refreshToken,
        lsDomainPrefix: process.env.LS_DOMAIN
      }
    };
    
    console.log('Testing customer sync...');
    try {
      await syncCustomers(mockReq);
      console.log('✅ Customer sync completed successfully');
    } catch (error) {
      console.error('❌ Customer sync failed:', error.message);
    }

    try {
      console.log('Testing sales sync...');
      await syncSales(mockReq);
      console.log('✅ Sales sync completed successfully');
    } catch (error) {
      console.error('❌ Sales sync failed:', error.message);
    }

    try {
      console.log('Testing users sync...');
      await syncUsers(mockReq);
      console.log('✅ Users sync completed successfully');
    } catch (error) {
      console.error('❌ Users sync failed:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('   Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  testSyncDirect();
}

module.exports = { testSyncDirect }; 