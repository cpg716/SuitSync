require('dotenv').config();

console.log('🔍 SuitSync Lightspeed OAuth Configuration Check\n');

const requiredEnvVars = {
  'LS_CLIENT_ID': process.env.LS_CLIENT_ID,
  'LS_CLIENT_SECRET': process.env.LS_CLIENT_SECRET,
  'LS_REDIRECT_URI': process.env.LS_REDIRECT_URI,
  'LS_DOMAIN': process.env.LS_DOMAIN,
  'FRONTEND_URL': process.env.FRONTEND_URL,
  'SESSION_SECRET': process.env.SESSION_SECRET,
  'DATABASE_URL': process.env.DATABASE_URL,
};

const optionalEnvVars = {
  'JWT_SECRET': process.env.JWT_SECRET,
  'NODE_ENV': process.env.NODE_ENV,
  'PORT': process.env.PORT,
};

console.log('📋 Required Environment Variables:');
let missingRequired = [];
for (const [key, value] of Object.entries(requiredEnvVars)) {
  const status = value ? '✅ SET' : '❌ MISSING';
  console.log(`- ${key}: ${status}`);
  if (!value) {
    missingRequired.push(key);
  }
}

console.log('\n📋 Optional Environment Variables:');
for (const [key, value] of Object.entries(optionalEnvVars)) {
  const status = value ? '✅ SET' : '⚠️  NOT SET (using default)';
  console.log(`- ${key}: ${status}`);
}

console.log('\n🔧 Configuration Details:');
if (process.env.LS_REDIRECT_URI) {
  console.log(`- Redirect URI: ${process.env.LS_REDIRECT_URI}`);
  console.log(`- Expected callback: ${process.env.LS_REDIRECT_URI}`);
}
if (process.env.LS_DOMAIN) {
  console.log(`- Lightspeed Domain: ${process.env.LS_DOMAIN}.retail.lightspeed.app`);
  console.log(`- Auth URL: https://secure.retail.lightspeed.app/connect`);
  console.log(`- Token URL: https://${process.env.LS_DOMAIN}.retail.lightspeed.app/api/1.0/token`);
}
if (process.env.FRONTEND_URL) {
  console.log(`- Frontend URL: ${process.env.FRONTEND_URL}`);
  console.log(`- Login page: ${process.env.FRONTEND_URL}/login`);
}

console.log('\n🚀 Authentication Flow:');
console.log('1. User clicks "Sign in with Lightspeed" on frontend');
console.log('2. Frontend redirects to: /api/auth/start-lightspeed');
console.log('3. Backend redirects to: https://secure.retail.lightspeed.app/connect');
console.log('4. Lightspeed redirects back to: LS_REDIRECT_URI (/api/auth/callback)');
console.log('5. Backend exchanges code for tokens and creates session');
console.log('6. User is redirected to: FRONTEND_URL (/)');

if (missingRequired.length > 0) {
  console.log('\n❌ CONFIGURATION ISSUES:');
  console.log(`Missing required environment variables: ${missingRequired.join(', ')}`);
  console.log('\nTo fix this, add the following to your .env file:');
  missingRequired.forEach(key => {
    switch (key) {
      case 'LS_CLIENT_ID':
        console.log(`${key}=your_lightspeed_client_id`);
        break;
      case 'LS_CLIENT_SECRET':
        console.log(`${key}=your_lightspeed_client_secret`);
        break;
      case 'LS_REDIRECT_URI':
        console.log(`${key}=http://localhost:3000/api/auth/callback`);
        break;
      case 'LS_DOMAIN':
        console.log(`${key}=your_lightspeed_domain_prefix`);
        break;
      case 'FRONTEND_URL':
        console.log(`${key}=http://localhost:3001`);
        break;
      case 'SESSION_SECRET':
        console.log(`${key}=your_random_session_secret`);
        break;
      case 'DATABASE_URL':
        console.log(`${key}=postgresql://username:password@localhost:5432/suitsync`);
        break;
      default:
        console.log(`${key}=your_value_here`);
    }
  });
  console.log('\n📖 See LIGHTSPEED_INTEGRATION_GUIDE.md for detailed setup instructions.');
} else {
  console.log('\n✅ All required environment variables are set!');
  console.log('\n🎯 Next steps:');
  console.log('1. Make sure your Lightspeed app is configured with the correct redirect URI');
  console.log('2. Ensure your database is running and migrated');
  console.log('3. Start the backend server: npm run dev');
  console.log('4. Navigate to the frontend and try signing in with Lightspeed');
}

console.log('\n🔗 Useful URLs:');
console.log(`- Backend health: http://localhost:${process.env.PORT || 3000}/api/health`);
console.log(`- Start Lightspeed auth: http://localhost:${process.env.PORT || 3000}/api/auth/start-lightspeed`);
console.log(`- Frontend: ${process.env.FRONTEND_URL || 'http://localhost:3001'}`);
console.log(`- Login page: ${process.env.FRONTEND_URL || 'http://localhost:3001'}/login`);
