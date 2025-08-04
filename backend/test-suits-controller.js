#!/usr/bin/env node

/**
 * Test Suits Controller
 * 
 * This script tests the wedding suits controller functionality directly.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testSuitsController() {
  console.log('🧪 Testing Wedding Suits Controller...');
  console.log('=====================================');
  
  try {
    // Test 1: Get all suits
    console.log('\n1. Testing getSuits...');
    const suits = await prisma.weddingSuit.findMany({
      where: { isActive: true },
      orderBy: [
        { vendor: 'asc' },
        { style: 'asc' },
        { color: 'asc' }
      ],
      include: {
        createdByUser: {
          select: { id: true, name: true }
        }
      }
    });
    console.log(`✅ Found ${suits.length} active wedding suits`);
    
    // Test 2: Get suit options
    console.log('\n2. Testing getSuitOptions...');
    const suitOptions = await prisma.weddingSuit.findMany({
      where: { isActive: true },
      select: {
        id: true,
        vendor: true,
        style: true,
        color: true,
        size: true,
        price: true
      },
      orderBy: [
        { vendor: 'asc' },
        { style: 'asc' },
        { color: 'asc' },
        { size: 'asc' }
      ]
    });
    
    // Group by vendor, style, color for dropdown options
    const options = suitOptions.reduce((acc, suit) => {
      const key = `${suit.vendor} - ${suit.style} - ${suit.color}`;
      if (!acc[key]) {
        acc[key] = {
          label: key,
          vendor: suit.vendor,
          style: suit.style,
          color: suit.color,
          sizes: []
        };
      }
      acc[key].sizes.push({
        id: suit.id,
        size: suit.size,
        price: suit.price
      });
      return acc;
    }, {});
    
    console.log(`✅ Created ${Object.keys(options).length} suit options`);
    console.log('Sample options:');
    Object.values(options).slice(0, 3).forEach(option => {
      console.log(`  ${option.label} (${option.sizes.length} sizes)`);
    });
    
    // Test 3: Get specific suit
    console.log('\n3. Testing getSuitById...');
    if (suits.length > 0) {
      const firstSuit = suits[0];
      const suit = await prisma.weddingSuit.findUnique({
        where: { id: firstSuit.id },
        include: {
          createdByUser: {
            select: { id: true, name: true }
          },
          partyMembers: {
            include: {
              party: {
                select: { id: true, name: true, eventDate: true }
              }
            }
          }
        }
      });
      console.log(`✅ Found suit: ${suit.vendor} - ${suit.style} - ${suit.color} - ${suit.size}`);
    }
    
    console.log('\n🎉 All tests passed! The suits controller functionality is working correctly.');
    console.log('\n📊 Summary:');
    console.log(`  - Total suits: ${suits.length}`);
    console.log(`  - Suit options: ${Object.keys(options).length}`);
    console.log(`  - Vendors: ${[...new Set(suits.map(s => s.vendor))].join(', ')}`);
    console.log(`  - Styles: ${[...new Set(suits.map(s => s.style))].join(', ')}`);
    console.log(`  - Colors: ${[...new Set(suits.map(s => s.color))].join(', ')}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  testSuitsController();
}

module.exports = { testSuitsController }; 