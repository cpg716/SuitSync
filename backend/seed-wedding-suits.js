#!/usr/bin/env node

/**
 * Seed Wedding Suits Script
 * 
 * This script creates sample wedding suits for testing the system.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const sampleSuits = [
  // Tommy Hilfiger
  { vendor: 'Tommy Hilfiger', style: 'Classic Fit', color: 'Navy', size: '38R', price: 299.99 },
  { vendor: 'Tommy Hilfiger', style: 'Classic Fit', color: 'Navy', size: '40R', price: 299.99 },
  { vendor: 'Tommy Hilfiger', style: 'Classic Fit', color: 'Navy', size: '42R', price: 299.99 },
  { vendor: 'Tommy Hilfiger', style: 'Classic Fit', color: 'Charcoal', size: '38R', price: 299.99 },
  { vendor: 'Tommy Hilfiger', style: 'Classic Fit', color: 'Charcoal', size: '40R', price: 299.99 },
  { vendor: 'Tommy Hilfiger', style: 'Classic Fit', color: 'Charcoal', size: '42R', price: 299.99 },
  { vendor: 'Tommy Hilfiger', style: 'Slim Fit', color: 'Black', size: '38R', price: 349.99 },
  { vendor: 'Tommy Hilfiger', style: 'Slim Fit', color: 'Black', size: '40R', price: 349.99 },
  { vendor: 'Tommy Hilfiger', style: 'Slim Fit', color: 'Black', size: '42R', price: 349.99 },
  
  // Calvin Klein
  { vendor: 'Calvin Klein', style: 'Modern Fit', color: 'Navy', size: '38R', price: 399.99 },
  { vendor: 'Calvin Klein', style: 'Modern Fit', color: 'Navy', size: '40R', price: 399.99 },
  { vendor: 'Calvin Klein', style: 'Modern Fit', color: 'Navy', size: '42R', price: 399.99 },
  { vendor: 'Calvin Klein', style: 'Modern Fit', color: 'Charcoal', size: '38R', price: 399.99 },
  { vendor: 'Calvin Klein', style: 'Modern Fit', color: 'Charcoal', size: '40R', price: 399.99 },
  { vendor: 'Calvin Klein', style: 'Modern Fit', color: 'Charcoal', size: '42R', price: 399.99 },
  { vendor: 'Calvin Klein', style: 'Slim Fit', color: 'Black', size: '38R', price: 449.99 },
  { vendor: 'Calvin Klein', style: 'Slim Fit', color: 'Black', size: '40R', price: 449.99 },
  { vendor: 'Calvin Klein', style: 'Slim Fit', color: 'Black', size: '42R', price: 449.99 },
  
  // Ralph Lauren
  { vendor: 'Ralph Lauren', style: 'Classic Fit', color: 'Navy', size: '38R', price: 499.99 },
  { vendor: 'Ralph Lauren', style: 'Classic Fit', color: 'Navy', size: '40R', price: 499.99 },
  { vendor: 'Ralph Lauren', style: 'Classic Fit', color: 'Navy', size: '42R', price: 499.99 },
  { vendor: 'Ralph Lauren', style: 'Classic Fit', color: 'Charcoal', size: '38R', price: 499.99 },
  { vendor: 'Ralph Lauren', style: 'Classic Fit', color: 'Charcoal', size: '40R', price: 499.99 },
  { vendor: 'Ralph Lauren', style: 'Classic Fit', color: 'Charcoal', size: '42R', price: 499.99 },
  { vendor: 'Ralph Lauren', style: 'Modern Fit', color: 'Black', size: '38R', price: 549.99 },
  { vendor: 'Ralph Lauren', style: 'Modern Fit', color: 'Black', size: '40R', price: 549.99 },
  { vendor: 'Ralph Lauren', style: 'Modern Fit', color: 'Black', size: '42R', price: 549.99 },
  
  // Hugo Boss
  { vendor: 'Hugo Boss', style: 'Slim Fit', color: 'Navy', size: '38R', price: 599.99 },
  { vendor: 'Hugo Boss', style: 'Slim Fit', color: 'Navy', size: '40R', price: 599.99 },
  { vendor: 'Hugo Boss', style: 'Slim Fit', color: 'Navy', size: '42R', price: 599.99 },
  { vendor: 'Hugo Boss', style: 'Slim Fit', color: 'Charcoal', size: '38R', price: 599.99 },
  { vendor: 'Hugo Boss', style: 'Slim Fit', color: 'Charcoal', size: '40R', price: 599.99 },
  { vendor: 'Hugo Boss', style: 'Slim Fit', color: 'Charcoal', size: '42R', price: 599.99 },
  { vendor: 'Hugo Boss', style: 'Modern Fit', color: 'Black', size: '38R', price: 649.99 },
  { vendor: 'Hugo Boss', style: 'Modern Fit', color: 'Black', size: '40R', price: 649.99 },
  { vendor: 'Hugo Boss', style: 'Modern Fit', color: 'Black', size: '42R', price: 649.99 },
];

async function seedWeddingSuits() {
  console.log('🌱 Seeding Wedding Suits...');
  console.log('================================');
  
  try {
    // Clear existing suits
    await prisma.weddingSuit.deleteMany({});
    console.log('✅ Cleared existing wedding suits');
    
    // Create sample suits
    const createdSuits = await prisma.weddingSuit.createMany({
      data: sampleSuits.map(suit => ({
        ...suit,
        isActive: true,
        description: `${suit.vendor} ${suit.style} suit in ${suit.color}`
      }))
    });
    
    console.log(`✅ Created ${createdSuits.count} wedding suits`);
    
    // Get a sample of created suits to show
    const sampleResults = await prisma.weddingSuit.findMany({
      take: 5,
      orderBy: { vendor: 'asc' }
    });
    
    console.log('\n📋 Sample created suits:');
    sampleResults.forEach(suit => {
      console.log(`   ${suit.vendor} - ${suit.style} - ${suit.color} - ${suit.size} - $${suit.price}`);
    });
    
    console.log('\n🔄 Now you can test the suits API:');
    console.log('   curl http://localhost:3000/api/suits');
    console.log('   curl http://localhost:3000/api/suits/options');
    
  } catch (error) {
    console.error('❌ Failed to seed wedding suits:', error.message);
    console.error('   Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  seedWeddingSuits();
}

module.exports = { seedWeddingSuits }; 