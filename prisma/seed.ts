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

  // Seed INSZN as the first venue (admin-added, RENTED_GYM)
  // costPerSession: ~$100 per 2hr session, stored in cents
  await prisma.venue.upsert({
    where: { id: "inszn-venue" },
    update: {},
    create: {
      id: "inszn-venue",
      name: "INSZN",
      type: "RENTED_GYM",
      address: "Chicago, IL",
      bookingUrl: "https://insznbasketball.com",
      costPerSession: 10000, // $100.00 in cents
    },
  });

  console.log("Seeded INSZN venue.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
