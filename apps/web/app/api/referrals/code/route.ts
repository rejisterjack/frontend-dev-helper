import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { auth } from "@/lib/auth";
import { randomCode } from "@/lib/crypto";

// 8 chars from a 32-char alphabet = ~40 bits of entropy. The previous
// implementation drew 5 chars from a 36-char alphabet using Math.random()
// (~25 bits, and not cryptographically secure).
const REFERRAL_CODE_LENGTH = 8;

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Check if user already has a referral code
    const existing = await prisma.referral.findFirst({
      where: { referrerId: userId },
    });

    if (existing) {
      return Response.json({ referralCode: existing.referralCode });
    }

    // Generate a unique code using a CSPRNG. Retry on (very unlikely)
    // collisions up to a bounded number of attempts.
    let code: string | undefined;
    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = `FDH-${randomCode(REFERRAL_CODE_LENGTH)}`;
      const taken = await prisma.referral.findUnique({
        where: { referralCode: candidate },
      });
      if (!taken) {
        code = candidate;
        break;
      }
    }

    if (!code) {
      // Extremely unlikely — 10 collisions in a row means a biased RNG or a
      // saturated keyspace. Fail loudly rather than writing undefined.
      logger.error(`Failed to allocate unique referral code for ${userId}`);
      return Response.json(
        { error: "Failed to allocate referral code" },
        { status: 500 },
      );
    }

    const referral = await prisma.referral.create({
      data: {
        referrerId: userId,
        referralCode: code,
        status: "PENDING",
      },
    });

    logger.info(`Referral code generated for user ${userId}`);

    return Response.json(
      { referralCode: referral.referralCode },
      { status: 201 },
    );
  } catch (error) {
    logger.error("Generate referral code error:", error);
    return Response.json(
      { error: "Failed to generate referral code" },
      { status: 500 },
    );
  }
}
