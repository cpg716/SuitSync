const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTables() {
  try {
    await prisma.checklist.findMany();
    console.log('✅ Checklist table exists');
  } catch (e) {
    console.log('❌ Checklist table missing:', e.message);
  }
  
  try {
    await prisma.task.findMany();
    console.log('✅ Task table exists');
  } catch (e) {
    console.log('❌ Task table missing:', e.message);
  }
  
  await prisma.$disconnect();
}

checkTables();