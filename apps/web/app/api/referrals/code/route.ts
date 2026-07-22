import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { auth } from "@/lib/auth";
import { randomCode } from "@/lib/crypto";
import { enforceRateLimit } from "@/lib/rate-limit";

const REFERRAL_CODE_LENGTH = 8;

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? undefined;
  const limited = await enforceRateLimit(request, {
    limit: 10,
    windowSeconds: 60,
    identifierSuffix: "referrals-code",
  });
  if (limited) return limited;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const existing = await prisma.referral.findFirst({
      where: { referrerId: userId },
    });

    if (existing) {
      return Response.json({ referralCode: existing.referralCode });
    }

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
      logger.error("Failed to allocate unique referral code", {
        requestId,
        userId,
      });
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

    logger.info("Referral code generated", { requestId, userId });

    return Response.json(
      { referralCode: referral.referralCode },
      { status: 201 },
    );
  } catch (error) {
    logger.error("Generate referral code error", { requestId, error });
    return Response.json(
      { error: "Failed to generate referral code" },
      { status: 500 },
    );
  }
}
