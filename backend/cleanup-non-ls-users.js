const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function run() {
  try {
    console.log('Cleaning non-Lightspeed users...');

    const testEmails = [
      'sales1@riversidemens.com',
      'sales2@riversidemens.com',
      'tailor1@riversidemens.com',
      'tailor2@riversidemens.com',
      'jerrod@riversidemens.com',
      'mandy@riversidemens.com',
      'natalie@riversidemens.com'
    ];

    const delByEmail = await prisma.user.deleteMany({ where: { email: { in: testEmails } } });
    console.log('Deleted by email:', delByEmail.count);

    const delByPrefix = await prisma.user.deleteMany({ where: { lightspeedEmployeeId: { startsWith: 'ls-' } } });
    console.log('Deleted by ls- prefix:', delByPrefix.count);

    const delNoLs = await prisma.user.deleteMany({ where: { lightspeedEmployeeId: null } });
    console.log('Deleted with no LS id:', delNoLs.count);

    const remaining = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, lightspeedEmployeeId: true }, orderBy: { name: 'asc' } });
    console.log('Remaining users:', remaining);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

run();
