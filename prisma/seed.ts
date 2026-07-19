import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL });
const prisma = new PrismaClient({ adapter });

const DEMO_SLUG = "demo-team";

const DEMO_PLAYERS: Array<{ name: string; number: number | null }> = [
  { name: "Marcus", number: 23 },
  { name: "Darius", number: 5 },
  { name: "Kwame", number: 11 },
  { name: "Jordan", number: 32 },
  { name: "Tyrese", number: 0 },
  { name: "Elijah", number: 14 },
  { name: "Caden", number: 7 },
  { name: "Nate", number: 21 },
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
    `Seeded demo team "${team.name}" (slug: ${team.slug}) with ${DEMO_PLAYERS.length} players.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
