import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

const prisma = new PrismaClient().$extends(withAccelerate());

async function main() {
  console.log("🚀 SuitSync is production-ready with no demo data");
  console.log("🔐 All authentication is through Lightspeed OAuth");
  console.log("👤 Users will be created automatically when they sign in via Lightspeed");
  console.log("📊 All data comes from real Lightspeed integration");
  console.log("✅ No demo data seeded - ready for production use");
  return;

  // Seed demo customers
  const customers = [];
  for (let i = 1; i <= 10; i++) {
    customers.push(await prisma.customer.create({
      data: {
        name: `Customer ${i}`,
        email: `customer${i}@demo.com`,
        phone: `555-000${i}`,
        lightspeedId: `LS-${i}`,
      }
    }));
  }

  // Seed alteration skills
  const skillNames = [
    'Shorten Sleeves',
    'Take in Sides',
    'Pad Shoulders',
    'Lengthen Trousers',
    'Fin. Hem',
    'Raise Collar',
    'Move Buttons',
    'Shorten Coat',
    'Chest',
    'Waist',
    'Thigh',
    'Knee',
    'With Cuffs',
    'Without Cuffs',
  ];
  const skills = [];
  for (const name of skillNames) {
    skills.push(await prisma.skill.create({ data: { name } }));
  }

  // Skills will be assigned to users when they are created via Lightspeed OAuth
  console.log(`✅ Created ${skills.length} alteration skills`);

  // Seed 10 demo parties
  const parties = [];
  for (let i = 1; i <= 10; i++) {
    const party = await prisma.party.create({
      data: {
        name: `Demo Wedding ${i}`,
        eventDate: new Date(Date.now() + i * 86400000),
        customerId: customers[i-1].id,
        externalId: null,
        syncedAt: null,
      }
    });
    parties.push(party);

    // Create 2 demo alteration jobs per party (without assigned tailors)
    for (let j = 1; j <= 2; j++) {
      await prisma.alterationJob.create({
        data: {
          jobNumber: `JOB-${i}-${j}`,
          qrCode: `QR-${i}-${j}`,
          partyId: party.id,
          customerId: null,
          notes: `Demo alteration ${j} for party ${i} - needs tailor assignment`,
          status: 'NOT_STARTED',
          timeSpentMinutes: 30 * j,
          tailorId: null, // Will be assigned when tailors sign in via Lightspeed
        }
      });
    }

    // Create 1 demo appointment per party (without assigned tailor)
    await prisma.appointment.create({
      data: {
        partyId: party.id,
        dateTime: new Date(Date.now() + i * 7200000),
        durationMinutes: 60,
        tailorId: null, // Will be assigned when tailors sign in via Lightspeed
        status: 'scheduled',
      }
    });
  }

  console.log(`✅ Created ${parties.length} demo parties with alteration jobs and appointments`);

  // Seed PartyMembers for each party
  const partyMembers = [];
  for (let i = 0; i < parties.length; i++) {
    for (let j = 1; j <= 4; j++) {
      partyMembers.push(await prisma.partyMember.create({
        data: {
          partyId: parties[i].id,
          lsCustomerId: customers[(i+j)%customers.length].id.toString(),
          role: j === 1 ? 'Groom' : 'Groomsman',
          measurements: `Chest: ${38+j}, Waist: ${32+j}`,
          notes: `Notes for member ${j} of party ${i+1}`,
          status: 'Selected',
        }
      }));
    }
  }

  // Note: Sale assignments will be created when sales staff sign in via Lightspeed
  console.log("📊 Demo data seeding complete!");
  console.log("🔐 To use SuitSync:");
  console.log("1. Start the backend server: npm run dev");
  console.log("2. Navigate to the frontend: http://localhost:3001");
  console.log("3. Click 'Sign in with Lightspeed' to authenticate");
  console.log("4. Users and roles will be synced from your Lightspeed account");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 