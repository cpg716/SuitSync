import { PrismaClient, AlterationJobStatus } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient().$extends(withAccelerate());

async function main() {
  // Double-run guard: if users exist, exit
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    console.log("Users exist, clearing and re-seeding...");
    // Clear existing data in correct order due to foreign key constraints
    for (const model of [
      'alterationJob', 'appointment', 'partyMember', 'saleAssignment', 'auditLog', 'party', 'customer', 'user', 'skill']) {
      try {
        // @ts-ignore
        await prisma[model].deleteMany();
      } catch (e: any) {
        console.warn(`Warning: Could not deleteMany for ${model}:`, e.message);
      }
    }
  }

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

  // Assign random subset of skills to each tailor
  for (const user of users) {
    const userSkills = skills.sort(() => 0.5 - Math.random()).slice(0, 5);
    await prisma.user.update({
      where: { id: user.id },
      data: { skills: { connect: userSkills.map((s: { id: number }) => ({ id: s.id })) } },
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
          jobNumber: `JOB-${i}-${j}`,
          qrCode: `QR-${i}-${j}`,
          partyId: party.id,
          customerId: null,
          notes: `Alteration ${j} for party ${i}`,
          status: 'NOT_STARTED',
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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 