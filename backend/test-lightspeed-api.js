const axios = require('axios');

async function testLightspeedAPI() {
  try {
    console.log('🔍 Testing Lightspeed API connection...');
    
    // Test the development endpoint
    const response = await axios.get('http://localhost:3001/api/auth/test-lightspeed', {
      withCredentials: true,
      headers: {
        'Cookie': 'connect.sid=your-session-cookie-here' // You'll need to replace this with actual session cookie
      }
    });
    
    console.log('✅ API Test Results:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('❌ API Test Failed:');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('Error:', error.message);
    }
    
    console.log('\n📋 To test the API:');
    console.log('1. Go to http://localhost:3001/login');
    console.log('2. Click "Sign in with Lightspeed"');
    console.log('3. Complete the OAuth flow');
    console.log('4. Then run this script again');
  }
}

testLightspeedAPI();
