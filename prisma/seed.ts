import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });
const prisma = new PrismaClient({ adapter });

const DEMO_SLUG = "demo-team";

// 15 players — mirrors the real roster size so the demo reflects how
// crowded the grid actually gets with a full team, not a partial one.
const DEMO_PLAYERS: Array<{ name: string; number: number | null }> = [
  { name: "Marcus", number: 23 },
  { name: "Darius", number: 5 },
  { name: "Kwame", number: 11 },
  { name: "Jordan", number: 32 },
  { name: "Tyrese", number: 0 },
  { name: "Elijah", number: 14 },
  { name: "Caden", number: 7 },
  { name: "Nate", number: 21 },
  { name: "Isaiah", number: 3 },
  { name: "Devon", number: 15 },
  { name: "Malik", number: 8 },
  { name: "Xavier", number: 2 },
  { name: "Terrence", number: 44 },
  { name: "Quincy", number: 12 },
  { name: "Amir", number: 30 },
];

async function main(): Promise<void> {
  console.log("Seeding demo team...");

  // Idempotent: delete existing demo team (cascade deletes players + defaults)
  await prisma.team.deleteMany({ where: { slug: DEMO_SLUG } });

  const team = await prisma.team.create({
    data: {
      slug: DEMO_SLUG,
      name: "Demo Squad",
      players: {
        create: DEMO_PLAYERS.map((p) => ({
          name: p.name,
          number: p.number,
          defaults: {
            create: [0, 1, 2, 3, 4, 5, 6].map((day) => ({
              dayOfWeek: day,
              status: "UNAVAILABLE" as const,
            })),
          },
        })),
      },
    },
  });

  console.log(
    `Seeded demo team "${team.name}" (slug: ${team.slug}) with ${DEMO_PLAYERS.length} players.`,
  );

  // Seed INSZN as the first venue (RENTED_GYM)
  // costPerHour: $50/hour, stored in cents (1hr=$50, 2hr=$100, 3hr=$150 per their booking site)
  // hours: roughly 6am-9pm per the booking site's earliest/latest appointment slots
  await prisma.venue.upsert({
    where: { id: "inszn-venue" },
    update: { costPerHour: 5000, openTime: "06:00", closeTime: "21:00" },
    create: {
      id: "inszn-venue",
      name: "INSZN",
      type: "RENTED_GYM",
      address: "Charlotte, NC",
      bookingUrl: "https://insznbasketball.com",
      costPerHour: 5000, // $50.00/hour in cents
      openTime: "06:00",
      closeTime: "21:00",
    },
  });

  console.log("Seeded INSZN venue.");

  // Seed a second venue for Game Day — the team's real game venue: open-gym time,
  // never rented, no cost.
  const gameVenue = await prisma.venue.upsert({
    where: { id: "community-center-venue" },
    update: {},
    create: {
      id: "community-center-venue",
      name: "Northside Community Center",
      type: "OPEN_GYM",
      address: "Charlotte, NC",
    },
  });

  console.log("Seeded Northside Community Center venue.");

  // One demo GAME session so /team/demo-team shows off the Game Day section —
  // next Thursday at 7:15pm, matching the real group's typical game slot.
  const proposer = await prisma.player.findFirst({
    where: { teamId: team.id },
    orderBy: { name: "asc" },
  });
  const nextThursday = new Date();
  nextThursday.setUTCHours(0, 0, 0, 0);
  nextThursday.setUTCDate(
    nextThursday.getUTCDate() + ((4 - nextThursday.getUTCDay() + 7) % 7 || 7),
  );

  await prisma.session.create({
    data: {
      teamId: team.id,
      venueId: gameVenue.id,
      proposedById: proposer?.id ?? null,
      kind: "GAME",
      date: nextThursday,
      fromTime: "19:15",
      toTime: "21:00",
      minPlayers: 5, // real forfeit threshold
    },
  });

  console.log("Seeded a demo Game Day session.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
