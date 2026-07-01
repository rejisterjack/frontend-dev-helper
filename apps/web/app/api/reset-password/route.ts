import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/rate-limit";
import { hashToken } from "@/lib/tokens";

const schema = z.object({
  token: z.string(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(request: Request) {
  // 10 reset submits per IP per minute — legitimate users rarely retry more
  // than once, but paste-retry loops shouldn't trip it.
  const limited = await enforceRateLimit(request, {
    limit: 10,
    windowSeconds: 60,
    identifierSuffix: "reset-password",
  });
  if (limited) return limited;
  try {
    const body = await request.json();
    const { token, password } = schema.parse(body);

    // Tokens are stored as SHA-256 hashes — hash the input and look it up.
    const user = await prisma.user.findFirst({
      where: {
        resetToken: hashToken(token),
        resetTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      return Response.json(
        { error: "Invalid or expired reset token" },
        { status: 400 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    logger.info(`Password reset: ${user.email}`);

    return Response.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 },
      );
    }
    logger.error("Reset password error:", error);
    return Response.json({ error: "Reset failed" }, { status: 500 });
  }
}
