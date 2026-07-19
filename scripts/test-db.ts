import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

// Standalone connectivity check for the pooled connection (DATABASE_URL) -
// the same path src/lib/prisma.ts uses at runtime. Run with `npm run db:test`.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const team = await prisma.team.create({
    data: { slug: "test-db-script", name: "Test DB Script" },
  });
  console.log("Created:", team);

  const found = await prisma.team.findUnique({ where: { id: team.id } });
  console.log("Read back:", found);

  await prisma.team.delete({ where: { id: team.id } });
  console.log("Deleted OK - connection round trip works");
}

main()
  .catch((error) => {
    console.error("Database test failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
