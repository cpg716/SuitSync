const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  await prisma.alteration.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.partyMember.deleteMany();
  await prisma.saleAssignment.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.party.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();
  await prisma.skill.deleteMany();

  // Seed demo users (tailors)
  const users = [];
  for (let i = 1; i <= 3; i++) {
    users.push(await prisma.user.create({
      data: {
        email: `tailor${i}@demo.com`,
        passwordHash: 'demo', // Not secure, just for demo
        name: `Tailor ${i}`,
        role: 'tailor',
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
      await prisma.alteration.create({
        data: {
          partyId: party.id,
          notes: `Alteration ${j} for party ${i}`,
          timeSpent: 30 * j,
          scheduledDateTime: new Date(Date.now() + (i+j) * 3600000),
          tailorId: users[(i+j)%users.length].id,
          status: 'pending',
          externalId: null,
          syncedAt: null,
          itemType: skill.name,
          estimatedTime: 30 + 10 * j,
          actualTime: null,
        }
      });
    }
    // 1 appointment each
    await prisma.appointment.create({
      data: {
        partyId: party.id,
        dateTime: new Date(Date.now() + i * 7200000),
        duration: 60,
        tailorId: users[i%users.length].id,
        status: 'scheduled',
        externalId: null,
        syncedAt: null,
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
        associateId: users[i%users.length].id,
        commissionRate: 0.1,
        amount: 100 + i * 10,
      }
    });
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