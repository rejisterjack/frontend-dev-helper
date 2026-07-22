import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { auth } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? undefined;
  const limited = await enforceRateLimit(request, {
    limit: 30,
    windowSeconds: 60,
    identifierSuffix: "referrals-list",
  });
  if (limited) return limited;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

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
        referred: r.referredId
          ? { status: "signed_up" as const, joinedAt: r.redeemedAt }
          : null,
        createdAt: r.createdAt,
        redeemedAt: r.redeemedAt,
      })),
    });
  } catch (error) {
    logger.error("Get referrals error", { requestId, error });
    return Response.json({ error: "Failed to get referrals" }, { status: 500 });
  }
}
