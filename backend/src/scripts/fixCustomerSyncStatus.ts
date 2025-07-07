import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.syncStatus.updateMany({
    where: { resource: 'customers' },
    data: {
      status: 'SUCCESS',
      errorMessage: null,
      lastSyncedAt: new Date(),
    },
  });
  console.log('SyncStatus for customers set to SUCCESS.');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}); 