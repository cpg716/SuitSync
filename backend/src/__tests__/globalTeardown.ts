export default async function globalTeardown() {
  console.log('🧹 Cleaning up test environment...');
  
  // Any global cleanup can go here
  
  console.log('✅ Test environment cleanup complete');
}
