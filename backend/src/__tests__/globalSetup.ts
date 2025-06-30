import { execSync } from 'child_process';

export default async function globalSetup() {
  console.log('🧪 Setting up test environment...');
  
  // Ensure PostgreSQL is running
  try {
    execSync('pg_isready', { stdio: 'ignore' });
  } catch (error) {
    console.error('❌ PostgreSQL is not running. Please start PostgreSQL before running tests.');
    process.exit(1);
  }

  // Ensure test user exists
  try {
    execSync('createuser -s suitsync', { stdio: 'ignore' });
  } catch (error) {
    // User might already exist
  }

  console.log('✅ Test environment setup complete');
}
