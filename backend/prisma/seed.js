const { PrismaClient } = require("@prisma/client");
const path = require('path');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

async function main() {
  // SuitSync is production-ready with no demo data
  // All users authenticate through Lightspeed OAuth
  console.log("🎭 Creating test party for workflow demonstration...");
  
  // Create test customer (groom)
  const testCustomer = await prisma.customer.create({
    data: {
      name: "John Smith",
      email: "john.smith@email.com",
      phone: "716-555-0123",
      measurements: {
        chest: 42,
        waist: 36,
        hips: 40,
        shoulder: 18,
        sleeve: 25,
        neck: 16,
        inseam: 32,
        outseam: 44
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
        chest: 42,
        waist: 36,
        hips: 40,
        shoulder: 18,
        sleeve: 25,
        neck: 16,
        inseam: 32,
        outseam: 44
      }
    },
    {
      role: "Best Man",
      status: "need_to_order",
      notes: "Mike Johnson - Best Man",
      measurements: {
        chest: 44,
        waist: 38,
        hips: 42,
        shoulder: 19,
        sleeve: 26,
        neck: 17,
        inseam: 33,
        outseam: 45
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
        chest: 40,
        waist: 34,
        hips: 38,
        shoulder: 17,
        sleeve: 24,
        neck: 15,
        inseam: 31,
        outseam: 43
      }
    }
  ];

  for (const memberData of testMembers) {
    await prisma.partyMember.create({
      data: {
        partyId: testParty.id,
        role: memberData.role,
        status: memberData.status,
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

  // Seed demo admin user
  const users = [];
  users.push(await prisma.user.create({
    data: {
      email: 'admin@demo.com',
      passwordHash: bcrypt.hashSync('admin', 10),
      name: 'Admin User',
      role: 'admin',
      photoUrl: 'https://randomuser.me/api/portraits/men/1.jpg',
    }
  }));

  // Seed demo users (tailors)
  for (let i = 1; i <= 3; i++) {
    users.push(await prisma.user.create({
      data: {
        email: `tailor${i}@demo.com`,
        passwordHash: bcrypt.hashSync('demo', 10),
        name: `Tailor ${i}`,
        role: 'tailor',
        photoUrl: `https://randomuser.me/api/portraits/men/${i+1}.jpg`,
      }
    }));
  }

  // Seed demo users (sales associates)
  const associates = [];
  for (let i = 1; i <= 3; i++) {
    associates.push(await prisma.user.create({
      data: {
        email: `sales${i}@demo.com`,
        passwordHash: bcrypt.hashSync('demo', 10),
        name: `Sales Associate ${i}`,
        role: 'associate',
        photoUrl: `https://randomuser.me/api/portraits/women/${i+1}.jpg`,
      }
    }));
  }

  // Seed demo users (support)
  const supportStaff = [];
  for (let i = 1; i <= 2; i++) {
    supportStaff.push(await prisma.user.create({
      data: {
        email: `support${i}@demo.com`,
        passwordHash: bcrypt.hashSync('demo', 10),
        name: `Support Staff ${i}`,
        role: 'support',
        photoUrl: `https://randomuser.me/api/portraits/men/${i+4}.jpg`,
      }
    }));
  }

  // Seed demo customers
  const customers = [];
  for (let i = 1; i <= 10; i++) {
    customers.push(await prisma.customer.create({
      data: {
        name: `Customer ${i}`,
        email: `customer${i}@demo.com`,
        phone: `555-000${i}`,
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

  // Assign random subset of skills to each tailor
  for (const user of users) {
    const userSkills = skills.sort(() => 0.5 - Math.random()).slice(0, 5);
    await prisma.user.update({
      where: { id: user.id },
      data: { skills: { connect: userSkills.map(s => ({ id: s.id })) } },
    });
  }

  // Seed 10 parties
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
    // 2 alterations each
    for (let j = 1; j <= 2; j++) {
      const skill = skills[(i+j)%skills.length];
      await prisma.alterationJob.create({
        data: {
          saleLineItemId: 1000 + i * 10 + j, // fake line item id
          partyId: party.id,
          customerId: null,
          notes: `Alteration ${j} for party ${i}`,
          status: 'pending',
          timeSpentMinutes: 30 * j,
          tailorId: users[(i+j)%users.length].id,
        }
      });
    }
    // 1 appointment each
    await prisma.appointment.create({
      data: {
        partyId: party.id,
        dateTime: new Date(Date.now() + i * 7200000),
        durationMinutes: 60,
        tailorId: users[i%users.length].id,
        status: 'scheduled',
      }
    });
  }

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

  // Seed SaleAssignments for each party
  for (let i = 0; i < parties.length; i++) {
    await prisma.saleAssignment.create({
      data: {
        saleId: `LS-SALE-${i+1}`,
        associateId: associates[i%associates.length].id,
        commissionRate: 0.1,
        amount: 100 + i * 10,
      }
    });
  }

  // Seed more SaleAssignments for each associate
  for (const associate of associates) {
    for (let i = 0; i < 5; i++) {
      await prisma.saleAssignment.create({
        data: {
          saleId: `LS-SALE-${associate.id}-${i+1}`,
          associateId: associate.id,
          commissionRate: 0.08 + 0.02 * (i % 3), // 8-12%
          amount: 120 + Math.floor(Math.random() * 300),
        }
      });
    }
  }

  // Add more appointments with varied statuses and times
  const appointmentStatuses = ['scheduled', 'completed', 'canceled'];
  for (let i = 0; i < parties.length; i++) {
    for (let j = 0; j < 3; j++) {
      await prisma.appointment.create({
        data: {
          partyId: parties[i].id,
          dateTime: new Date(Date.now() + (i * 2 + j) * 3600000),
          durationMinutes: 30 + 15 * j,
          tailorId: users[(i + j) % users.length].id,
          status: appointmentStatuses[(i + j) % appointmentStatuses.length],
        }
      });
    }
  }

  // Add more alteration jobs with varied statuses, tailors, and time spent
  const alterationStatuses = ['pending', 'complete'];
  for (let i = 0; i < parties.length; i++) {
    for (let j = 0; j < 4; j++) {
      const skill = skills[(i * 2 + j) % skills.length];
      await prisma.alterationJob.create({
        data: {
          saleLineItemId: 2000 + i * 10 + j,
          partyId: parties[i].id,
          customerId: customers[(i + j) % customers.length].id,
          notes: `Extra alteration ${j + 1} for party ${i + 1}`,
          status: alterationStatuses[(i + j) % alterationStatuses.length],
          timeSpentMinutes: 20 + 10 * j,
          tailorId: users[(i + j) % users.length].id,
        }
      });
    }
  }

  // Add more party members with varied roles and measurements
  const memberRoles = ['Groom', 'Groomsman', 'Best Man', 'Father', 'Ring Bearer'];
  for (let i = 0; i < parties.length; i++) {
    for (let j = 5; j <= 8; j++) {
      await prisma.partyMember.create({
        data: {
          partyId: parties[i].id,
          lsCustomerId: customers[(i + j) % customers.length].id.toString(),
          role: memberRoles[j % memberRoles.length],
          measurements: `Chest: ${36 + j}, Waist: ${30 + j}, Height: ${65 + j} in`,
          notes: `Extra notes for member ${j} of party ${i + 1}`,
          status: j % 2 === 0 ? 'Selected' : 'Fitted',
        }
      });
    }
  }

  console.log("✅ Demo data seeded");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });