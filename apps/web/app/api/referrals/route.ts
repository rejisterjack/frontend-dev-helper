import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Only fetch fields needed for the referrer's view. We deliberately do
    // NOT include the referred user's email/name — a referrer should only see
    // aggregate state, not the identity of who they referred.
    const referrals = await prisma.referral.findMany({
      where: { referrerId: userId },
      select: {
        id: true,
        referralCode: true,
        status: true,
        reward: true,
        redeemedAt: true,
        createdAt: true,
        referredId: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return Response.json({
      referrals: referrals.map((r) => ({
        id: r.id,
        referralCode: r.referralCode,
        status: r.status,
        reward: r.reward,
        // Expose only the fact of sign-up + the redemption timestamp. PII
        // (referred user's email/name) is intentionally withheld.
        referred: r.referredId
          ? { status: "signed_up" as const, joinedAt: r.redeemedAt }
          : null,
        createdAt: r.createdAt,
        redeemedAt: r.redeemedAt,
      })),
    });
  } catch (error) {
    logger.error("Get referrals error:", error);
    return Response.json({ error: "Failed to get referrals" }, { status: 500 });
  }
}
