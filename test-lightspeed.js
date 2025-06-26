#!/usr/bin/env node

/**
 * Test script to verify Lightspeed API integration
 * Based on the Lightspeed Quick Start guide
 */

const axios = require('axios');

async function testLightspeedConnection() {
  try {
    console.log('🧪 Testing Lightspeed API Integration...\n');

    // Test 1: Check if we can authenticate
    console.log('1. Testing authentication flow...');
    const authResponse = await axios.post('http://localhost:3000/api/auth/login', {}, {
      withCredentials: true
    });
    
    if (authResponse.data.authUrl) {
      console.log('✅ Auth URL generated successfully');
      console.log('   URL:', authResponse.data.authUrl);
    } else {
      console.log('❌ Failed to generate auth URL');
      return;
    }

    console.log('\n2. Manual step required:');
    console.log('   Please visit the auth URL above and complete the OAuth flow');
    console.log('   Then run: curl -b cookies.txt http://localhost:3000/api/auth/test-lightspeed');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testLightspeedConnection(); 