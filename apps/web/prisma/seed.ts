/**
 * Prisma seed script.
 *
 * Run via `bun run --filter=web db:seed` (configured in prisma.config.ts).
 *
 * Seeds the minimum data needed for a fresh install to behave correctly:
 * nothing today. As the product grows, add feature-flag defaults, an admin
 * role, or initial marketing landing-page content here.
 *
 * Idempotent: safe to run multiple times.
 */
import { prisma } from "../lib/db";

async function main() {
  // No baseline rows today. Kept as a placeholder so the seed command works
  // and so future seeds have a single entry point.
  const userCount = await prisma.user.count();
  console.log(`Seed complete. Users in DB: ${userCount}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
