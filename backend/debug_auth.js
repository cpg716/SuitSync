const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

async function debugAuth() {
  console.log('🔍 Debugging Authentication...\n');

  // Check environment variables
  console.log('Environment Variables:');
  console.log('- NODE_ENV:', process.env.NODE_ENV);
  console.log('- JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');
  console.log('- SESSION_SECRET:', process.env.SESSION_SECRET ? 'SET' : 'NOT SET');
  console.log('- DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
  console.log('');

  try {
    // Check database connection
    await prisma.$connect();
    console.log('✅ Database connection successful\n');

    // Check if users exist
    const userCount = await prisma.user.count();
    console.log(`📊 Total users in database: ${userCount}\n`);

    if (userCount === 0) {
      console.log('❌ No users found! Run: npm run seed\n');
      return;
    }

    // Get admin user
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@demo.com' }
    });

    if (!adminUser) {
      console.log('❌ Admin user not found! Expected: admin@demo.com\n');
      
      // Show available users
      const users = await prisma.user.findMany({
        select: { id: true, email: true, name: true, role: true }
      });
      console.log('Available users:');
      users.forEach(user => {
        console.log(`- ${user.email} (${user.role})`);
      });
      return;
    }

    console.log('✅ Admin user found:');
    console.log(`- ID: ${adminUser.id}`);
    console.log(`- Email: ${adminUser.email}`);
    console.log(`- Name: ${adminUser.name}`);
    console.log(`- Role: ${adminUser.role}`);
    console.log(`- Has password hash: ${adminUser.passwordHash ? 'YES' : 'NO'}`);
    console.log('');

    // Test password verification
    if (adminUser.passwordHash) {
      const testPassword = 'admin';
      const isValid = await bcrypt.compare(testPassword, adminUser.passwordHash);
      console.log(`🔐 Password verification for '${testPassword}': ${isValid ? '✅ VALID' : '❌ INVALID'}`);
      
      if (!isValid) {
        // Try common passwords
        const commonPasswords = ['admin', 'demo', 'password', 'changeme'];
        console.log('\nTrying common passwords:');
        for (const pwd of commonPasswords) {
          const valid = await bcrypt.compare(pwd, adminUser.passwordHash);
          console.log(`- '${pwd}': ${valid ? '✅ VALID' : '❌ INVALID'}`);
          if (valid) break;
        }
      }
    }
    console.log('');

    // Test JWT token generation
    const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'changeme';
    console.log(`🔑 Using JWT secret: ${JWT_SECRET === 'changeme' ? 'DEFAULT (changeme)' : 'CUSTOM'}`);
    
    try {
      const testToken = jwt.sign(
        { id: adminUser.id, email: adminUser.email, role: adminUser.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      console.log('✅ JWT token generation: SUCCESS');
      
      // Test token verification
      const decoded = jwt.verify(testToken, JWT_SECRET);
      console.log('✅ JWT token verification: SUCCESS');
      console.log(`- Decoded ID: ${decoded.id}`);
      console.log(`- Decoded Email: ${decoded.email}`);
    } catch (jwtError) {
      console.log('❌ JWT token error:', jwtError.message);
    }
    console.log('');

    // Test complete login flow
    console.log('🧪 Testing complete login flow:');
    const loginData = {
      email: 'admin@demo.com',
      password: 'admin'
    };

    console.log(`1. Email: ${loginData.email}`);
    console.log(`2. Password: ${loginData.password}`);
    
    const user = await prisma.user.findUnique({ where: { email: loginData.email } });
    if (!user || !user.passwordHash) {
      console.log('❌ Step 1 failed: User not found or no password hash');
      return;
    }
    console.log('✅ Step 1: User found');

    const valid = await bcrypt.compare(loginData.password, user.passwordHash);
    if (!valid) {
      console.log('❌ Step 2 failed: Password verification failed');
      return;
    }
    console.log('✅ Step 2: Password verified');

    const jwtToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    console.log('✅ Step 3: JWT token created');
    console.log(`Token: ${jwtToken.substring(0, 50)}...`);

    console.log('\n🎉 Authentication flow test: SUCCESS!');
    console.log('\nYou should be able to login with:');
    console.log('- Email: admin@demo.com');
    console.log('- Password: admin');

  } catch (error) {
    console.error('❌ Error during debug:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugAuth();
