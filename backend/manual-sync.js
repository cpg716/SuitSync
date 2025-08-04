#!/usr/bin/env node

/**
 * Manual Sync Script
 * 
 * This script allows you to manually sync data and manage wedding suits
 * without dealing with API routes or authentication.
 */

const { PrismaClient } = require('@prisma/client');
const { syncCustomers } = require('./dist/services/syncService');

const prisma = new PrismaClient();

async function manualSync() {
  console.log('🔄 Manual Sync Tool');
  console.log('==================');
  
  const command = process.argv[2];
  
  try {
    switch (command) {
      case 'customers':
        console.log('📥 Syncing customers from Lightspeed...');
        await syncCustomers({});
        console.log('✅ Customer sync completed!');
        break;
        
      case 'status':
        console.log('📊 Database Status:');
        const [customerCount, suitCount] = await Promise.all([
          prisma.customer.count(),
          prisma.weddingSuit.count()
        ]);
        console.log(`  Customers: ${customerCount}`);
        console.log(`  Wedding Suits: ${suitCount}`);
        break;
        
      case 'suits':
        console.log('👔 Wedding Suits:');
        const suits = await prisma.weddingSuit.findMany({
          orderBy: [
            { vendor: 'asc' },
            { style: 'asc' },
            { color: 'asc' }
          ]
        });
        
        suits.forEach(suit => {
          console.log(`  ${suit.vendor} - ${suit.style} - ${suit.color} - ${suit.size} - $${suit.price}`);
        });
        break;
        
      case 'add-suit':
        const vendor = process.argv[3];
        const style = process.argv[4];
        const color = process.argv[5];
        const size = process.argv[6];
        const price = parseFloat(process.argv[7]) || null;
        
        if (!vendor || !style || !color || !size) {
          console.log('❌ Usage: node manual-sync.js add-suit <vendor> <style> <color> <size> [price]');
          console.log('Example: node manual-sync.js add-suit "Tommy Hilfiger" "Classic Fit" "Navy" "44R" 299.99');
          break;
        }
        
        const newSuit = await prisma.weddingSuit.create({
          data: {
            vendor,
            style,
            color,
            size,
            price,
            description: `${vendor} ${style} suit in ${color}`,
            isActive: true
          }
        });
        
        console.log(`✅ Added suit: ${newSuit.vendor} - ${newSuit.style} - ${newSuit.color} - ${newSuit.size}`);
        break;
        
      case 'help':
      default:
        console.log('Available commands:');
        console.log('  customers  - Sync customers from Lightspeed');
        console.log('  status     - Show database status');
        console.log('  suits      - List all wedding suits');
        console.log('  add-suit   - Add a new wedding suit');
        console.log('  help       - Show this help');
        console.log('');
        console.log('Examples:');
        console.log('  node manual-sync.js customers');
        console.log('  node manual-sync.js status');
        console.log('  node manual-sync.js suits');
        console.log('  node manual-sync.js add-suit "Calvin Klein" "Slim Fit" "Black" "40R" 399.99');
        break;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  manualSync();
}

module.exports = { manualSync }; 