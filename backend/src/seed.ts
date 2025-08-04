import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

const prisma = new PrismaClient().$extends(withAccelerate());

async function main() {
  console.log("🎭 Creating test party for workflow demonstration...");
  
  // Create test customer (groom)
  const testCustomer = await prisma.customer.create({
    data: {
      name: "John Smith",
      email: "john.smith@email.com",
      phone: "716-555-0123",
      lightspeedId: "LS-TEST-001",
      measurements: {
        create: {
          chest: "42",
          waistJacket: "36",
          hips: "40",
          shoulderWidth: "18",
          sleeveLength: "25",
          neck: "16",
          inseam: "32",
          outseam: "44"
        }
      }
    }
  });

  // Create test party
  const testParty = await prisma.party.create({
    data: {
      name: "Smith Wedding Party",
      eventDate: new Date("2024-12-15"),
      notes: "Test party for workflow demonstration",
      customerId: testCustomer.id
    }
  });

  // Create test party members with different statuses
  const testMembers = [
    {
      role: "Groom",
      status: "ordered",
      notes: "John Smith - Groom",
      suitOrderId: "SUIT-001",
      accessoriesOrderId: "ACC-001",
      orderedAt: new Date("2024-11-01"),
      measurements: {
        chest: "42",
        waistJacket: "36",
        hips: "40",
        shoulderWidth: "18",
        sleeveLength: "25",
        neck: "16",
        inseam: "32",
        outseam: "44"
      }
    },
    {
      role: "Best Man",
      status: "need_to_order",
      notes: "Mike Johnson - Best Man",
      measurements: {
        chest: "44",
        waistJacket: "38",
        hips: "42",
        shoulderWidth: "19",
        sleeveLength: "26",
        neck: "17",
        inseam: "33",
        outseam: "45"
      }
    },
    {
      role: "Groomsman",
      status: "awaiting_measurements",
      notes: "David Wilson - Groomsman #1"
    },
    {
      role: "Groomsman",
      status: "being_altered",
      notes: "Tom Brown - Groomsman #2",
      suitOrderId: "SUIT-002",
      accessoriesOrderId: "ACC-002",
      orderedAt: new Date("2024-10-15"),
      receivedAt: new Date("2024-11-10"),
      alteredAt: new Date("2024-11-20"),
      measurements: {
        chest: "40",
        waistJacket: "34",
        hips: "38",
        shoulderWidth: "17",
        sleeveLength: "24",
        neck: "15",
        inseam: "31",
        outseam: "43"
      }
    }
  ];

  for (const memberData of testMembers) {
    await prisma.partyMember.create({
      data: {
        partyId: testParty.id,
        role: memberData.role,
        status: memberData.status as any,
        notes: memberData.notes,
        suitOrderId: memberData.suitOrderId,
        accessoriesOrderId: memberData.accessoriesOrderId,
        orderedAt: memberData.orderedAt,
        receivedAt: memberData.receivedAt,
        alteredAt: memberData.alteredAt,
        measurements: memberData.measurements
      }
    });
  }

  console.log("✅ Test party created successfully!");
  console.log("📋 Test Party Details:");
  console.log(`   - Name: ${testParty.name}`);
  console.log(`   - Event Date: ${testParty.eventDate.toDateString()}`);
  console.log(`   - Groom: ${testCustomer.name} (${testCustomer.phone})`);
  console.log(`   - Members: ${testMembers.length} total`);
  console.log("🎯 You can now test the workflow status system!");
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