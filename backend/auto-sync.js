#!/usr/bin/env node

/**
 * Auto Sync Script
 * 
 * This script runs automatically to keep your data in sync with Lightspeed.
 * It runs every 6 hours by default.
 */

const { PrismaClient } = require('@prisma/client');
const { syncCustomers } = require('./dist/services/syncService');

const prisma = new PrismaClient();

// Configuration
const SYNC_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours
const LOG_INTERVAL = 60 * 60 * 1000; // 1 hour

let syncCount = 0;
let lastSyncTime = null;

async function performSync() {
  try {
    console.log(`🔄 [${new Date().toISOString()}] Starting auto-sync #${++syncCount}...`);
    
    // Sync customers
    await syncCustomers({});
    
    lastSyncTime = new Date();
    console.log(`✅ [${lastSyncTime.toISOString()}] Auto-sync #${syncCount} completed successfully`);
    
    // Log status every hour
    const [customerCount, suitCount] = await Promise.all([
      prisma.customer.count(),
      prisma.weddingSuit.count()
    ]);
    
    console.log(`📊 Status: ${customerCount} customers, ${suitCount} wedding suits`);
    
  } catch (error) {
    console.error(`❌ [${new Date().toISOString()}] Auto-sync #${syncCount} failed:`, error.message);
  }
}

async function startAutoSync() {
  console.log('🚀 Starting Auto-Sync Service');
  console.log('=============================');
  console.log(`⏰ Sync interval: ${SYNC_INTERVAL / (60 * 60 * 1000)} hours`);
  console.log(`📝 Log interval: ${LOG_INTERVAL / (60 * 60 * 1000)} hour`);
  console.log('');
  
  // Perform initial sync
  await performSync();
  
  // Set up periodic sync
  setInterval(performSync, SYNC_INTERVAL);
  
  // Set up periodic status logging
  setInterval(async () => {
    if (lastSyncTime) {
      const [customerCount, suitCount] = await Promise.all([
        prisma.customer.count(),
        prisma.weddingSuit.count()
      ]);
      console.log(`📊 [${new Date().toISOString()}] Status: ${customerCount} customers, ${suitCount} suits (Last sync: ${lastSyncTime.toISOString()})`);
    }
  }, LOG_INTERVAL);
  
  console.log('✅ Auto-sync service is running...');
  console.log('Press Ctrl+C to stop');
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Stopping auto-sync service...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Stopping auto-sync service...');
  await prisma.$disconnect();
  process.exit(0);
});

if (require.main === module) {
  startAutoSync();
}

module.exports = { startAutoSync, performSync }; 