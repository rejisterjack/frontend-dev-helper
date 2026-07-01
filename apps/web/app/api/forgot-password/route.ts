import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { sendPasswordResetEmail } from "@/lib/email";
import { randomBytes } from "crypto";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/rate-limit";
import { hashToken } from "@/lib/tokens";

const schema = z.object({ email: z.string().email() });

export async function POST(request: Request) {
  // 3 reset requests per IP per minute, 5 per email per hour.
  const ipLimited = await enforceRateLimit(request, {
    limit: 3,
    windowSeconds: 60,
    identifierSuffix: "forgot-password",
  });
  if (ipLimited) return ipLimited;

  try {
    const body = await request.json();
    const { email } = schema.parse(body);

    // Email-level throttle.
    const emailLimited = await enforceRateLimit(request, {
      limit: 5,
      windowSeconds: 3600,
      identifierSuffix: `forgot-password:${email.toLowerCase()}`,
    });
    if (emailLimited) return emailLimited;

    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration
    if (!user || !user.passwordHash) {
      return Response.json({
        success: true,
        message: "If an account exists, a reset link will be sent",
      });
    }

    const resetToken = randomBytes(32).toString("hex");
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store only the SHA-256 hash; plaintext goes only to the user's email.
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: hashToken(resetToken),
        resetTokenExpiry: resetExpiry,
      },
    });

    await sendPasswordResetEmail(email, resetToken, user.name || undefined);

    return Response.json({
      success: true,
      message: "If an account exists, a reset link will be sent",
    });
  } catch (error) {
    logger.error("Forgot password error:", error);
    return Response.json({ error: "Request failed" }, { status: 500 });
  }
}
