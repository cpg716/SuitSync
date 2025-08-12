#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:3000/api';
const COOKIE_FILE = path.join(__dirname, '..', 'cookies.txt');

async function quickAuth() {
  try {
    console.log('🔐 SuitSync Quick Authentication');
    console.log('===============================\n');

    // Check if cookies file exists
    if (!fs.existsSync(COOKIE_FILE)) {
      console.log('Creating new cookie file...');
      fs.writeFileSync(COOKIE_FILE, '');
    }

    // Read existing cookies
    const cookieData = fs.readFileSync(COOKIE_FILE, 'utf8');
    // Parse Netscape cookie format and extract the actual cookie
    const cookieLines = cookieData.split('\n').filter(line => !line.startsWith('#') && line.trim());
    const cookies = cookieLines.length > 0 ? cookieLines.join('; ') : '';

    // Get active users
    console.log('📋 Fetching active users...');
    const usersResponse = await axios.get(`${API_BASE}/user-selection/active-users`, {
      headers: cookies ? { Cookie: cookies } : {}
    });

    const users = usersResponse.data.users;
    
    if (users.length === 0) {
      console.log('❌ No active users found. Please log in with Lightspeed first.');
      return;
    }

    console.log(`✅ Found ${users.length} active user(s):\n`);
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email}) - ${user.role}`);
      console.log(`   Last active: ${new Date(user.lastActiveAt).toLocaleString()}\n`);
    });

    // Select the first user (or you can modify this to prompt for selection)
    const selectedUser = users[0];
    console.log(`🔑 Selecting user: ${selectedUser.name}`);

    // Select the user
    const selectResponse = await axios.post(`${API_BASE}/user-selection/select-user`, {
      lightspeedUserId: selectedUser.id
    }, {
      headers: {
        'Content-Type': 'application/json',
        ...(cookies ? { Cookie: cookies } : {})
      }
    });

    if (selectResponse.data.success) {
      console.log('✅ User selected successfully!');
      console.log(`👤 Active user: ${selectedUser.name}`);
      
      // Test authentication
      console.log('\n🧪 Testing authentication...');
      const statsResponse = await axios.get(`${API_BASE}/stats/dashboard`, {
        headers: cookies ? { Cookie: cookies } : {}
      });
      
      if (statsResponse.status === 200) {
        console.log('✅ Authentication successful! API endpoints are now accessible.');
        console.log('\n📊 Dashboard stats:', statsResponse.data);
      } else {
        console.log('❌ Authentication test failed');
      }
    } else {
      console.log('❌ Failed to select user');
    }

  } catch (error) {
    console.error('❌ Error during authentication:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the authentication
quickAuth(); 