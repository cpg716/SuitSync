const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const resource = process.argv[2];
  if (!resource) {
    console.error('Please provide a resource name (e.g., customers, products, sales).');
    console.error('Example: node prisma/reset-sync-status.js customers');
    process.exit(1);
  }

  try {
    const result = await prisma.syncStatus.deleteMany({
      where: {
        resource: resource,
      },
    });
    if (result.count > 0) {
        console.log(`✅ Successfully deleted ${result.count} sync status record(s) for resource: ${resource}`);
        console.log(`ℹ️ The next sync for '${resource}' will now perform a full sync.`);
    } else {
        console.log(`- No sync status found for '${resource}'. A full sync will occur on the next run anyway.`);
    }
  } catch (error) {
    console.error(`❌ Error resetting sync status for ${resource}:`, error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 