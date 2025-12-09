const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  // FIRs
  const firLisbon = await prisma.fir.upsert({
    where: { slug: "lppt-fir" },
    update: {},
    create: {
      slug: "lppt-fir",
      name: "Lisbon FIR",
      description: "Lisbon FIR placeholder",
      boundaries: "{}",
    },
  });

  const firPorto = await prisma.fir.upsert({
    where: { slug: "lppr-fir" },
    update: {},
    create: {
      slug: "lppr-fir",
      name: "Porto FIR",
      description: "Porto FIR placeholder",
      boundaries: "{}",
    },
  });

  // Airports
  const lppt = await prisma.airport.upsert({
    where: { icao: "LPPT" },
    update: {},
    create: {
      icao: "LPPT",
      iata: "LIS",
      name: "Lisbon Humberto Delgado",
      latitude: 38.7742,
      longitude: -9.1342,
      altitudeFt: 374,
      firId: firLisbon.id,
      runways: JSON.stringify([{ id: "03/21", length: 3805, surface: "ASP" }]),
      holdingPoints: "[]",
      frequencies: JSON.stringify([{ type: "TWR", value: "118.105" }]),
      stands: JSON.stringify([{ id: "501" }, { id: "502" }]),
      charts: null,
      scenery: null,
      notes: "Demo airport",
    },
  });

  const lppr = await prisma.airport.upsert({
    where: { icao: "LPPR" },
    update: {},
    create: {
      icao: "LPPR",
      iata: "OPO",
      name: "Porto Francisco Sá Carneiro",
      latitude: 41.2481,
      longitude: -8.6814,
      altitudeFt: 228,
      firId: firPorto.id,
      runways: JSON.stringify([{ id: "17/35", length: 3480, surface: "ASP" }]),
      holdingPoints: "[]",
      frequencies: JSON.stringify([{ type: "TWR", value: "118.500" }]),
      stands: JSON.stringify([{ id: "201" }, { id: "202" }]),
      charts: null,
      scenery: null,
      notes: "Demo airport",
    },
  });

  // Users
  const adminUser = await prisma.user.upsert({
    where: { vid: "100000" },
    update: {},
    create: {
      vid: "100000",
      name: "Admin User",
      email: "admin@example.com",
      role: "ADMIN",
    },
  });

  const staffUser = await prisma.user.upsert({
    where: { vid: "100001" },
    update: {},
    create: {
      vid: "100001",
      name: "Staff User",
      email: "staff@example.com",
      role: "STAFF",
    },
  });

  // Events
  const event1 = await prisma.event.upsert({
    where: { slug: "lisbon-night-ops" },
    update: {},
    create: {
      slug: "lisbon-night-ops",
      title: "Lisbon Night Ops",
      description: "Night operations at LPPT with coordinated ATC.",
      startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      isPublished: true,
      airports: { connect: [{ id: lppt.id }] },
      firs: { connect: [{ id: firLisbon.id }] },
    },
  });

  await prisma.eventRegistration.upsert({
    where: {
      userId_eventId: {
        userId: adminUser.id,
        eventId: event1.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      eventId: event1.id,
    },
  });

  // Training requests & sessions
  await prisma.trainingRequest.createMany({
    data: [
      {
        userId: adminUser.id,
        type: "ATC checkout",
        message: "Need a checkout for LPPT TWR.",
        status: "pending",
      },
      {
        userId: staffUser.id,
        type: "Pilot refresh",
        message: "Review SID/STAR updates.",
        status: "accepted",
      },
    ],
  });

  await prisma.trainingSession.create({
    data: {
      userId: adminUser.id,
      instructorId: staffUser.id,
      dateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      type: "ATC exam",
      notes: "Focus on ground coordination.",
    },
  });

  console.log("Seed data inserted.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
