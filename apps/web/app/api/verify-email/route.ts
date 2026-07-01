import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/rate-limit";
import { hashToken } from "@/lib/tokens";

const schema = z.object({ token: z.string() });

export async function POST(request: Request) {
  // 20 verification submits per IP per minute. Higher than others because
  // users click the link from email (could be prefetch/preview renders).
  const limited = await enforceRateLimit(request, {
    limit: 20,
    windowSeconds: 60,
    identifierSuffix: "verify-email",
  });
  if (limited) return limited;
  try {
    const body = await request.json();
    const { token } = schema.parse(body);

    // Stored as SHA-256 hash — hash input before lookup.
    const verification = await prisma.emailVerification.findUnique({
      where: { token: hashToken(token) },
    });

    if (!verification) {
      return Response.json(
        { error: "Invalid verification token" },
        { status: 400 },
      );
    }

    if (verification.expiresAt < new Date()) {
      await prisma.emailVerification.delete({ where: { id: verification.id } });
      return Response.json(
        { error: "Verification token expired" },
        { status: 400 },
      );
    }

    // Mark email as verified
    await prisma.user.update({
      where: { id: verification.userId },
      data: { emailVerified: true },
    });

    // Remove used token
    await prisma.emailVerification.delete({ where: { id: verification.id } });

    logger.info(`Email verified: user ${verification.userId}`);

    return Response.json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (error) {
    logger.error("Email verification error:", error);
    return Response.json({ error: "Verification failed" }, { status: 500 });
  }
}
