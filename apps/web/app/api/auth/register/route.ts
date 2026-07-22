import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  sendVerificationEmail,
  sendReferralNotificationEmail,
} from "@/lib/email";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/rate-limit";
import { hashToken } from "@/lib/tokens";

const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  email: z.string().trim().toLowerCase().email("Invalid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(160),
  referralCode: z.string().trim().max(32).optional(),
});

const successMessage =
  "If this email is not already registered, an account has been created and a verification link sent.";

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? undefined;

  const ipLimited = await enforceRateLimit(request, {
    limit: 5,
    windowSeconds: 60,
    identifierSuffix: "register",
  });
  if (ipLimited) return ipLimited;

  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      const email = body?.email;
      if (typeof email === "string") {
        await enforceRateLimit(request, {
          limit: 3,
          windowSeconds: 3600,
          identifierSuffix: `register:${email.toLowerCase()}`,
        });
      }
      return NextResponse.json({ message: successMessage }, { status: 200 });
    }

    const { name, email, password, referralCode: rawCode } = parsed.data;
    const referralCode = rawCode?.trim() || undefined;

    const emailLimited = await enforceRateLimit(request, {
      limit: 3,
      windowSeconds: 3600,
      identifierSuffix: `register:${email}`,
    });
    if (emailLimited) return emailLimited;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ message: successMessage }, { status: 200 });
    }

    const passwordHash = await hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
    });

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.emailVerification.create({
      data: {
        token: hashToken(token),
        userId: user.id,
        expiresAt,
      },
    });

    const emailResult = await sendVerificationEmail(email, token, name);
    if (!emailResult.success) {
      await prisma.emailVerification.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
      logger.error("Registration email failed", {
        requestId,
        error: emailResult.error,
      });
      return NextResponse.json(
        {
          error:
            "We could not send a verification email. Please try again later.",
        },
        { status: 502 },
      );
    }

    // Soft referral redemption — invalid codes are ignored (anti-enumeration).
    if (referralCode) {
      try {
        const referral = await prisma.referral.findUnique({
          where: { referralCode },
          include: { referrer: { select: { id: true, email: true, name: true } } },
        });
        if (
          referral &&
          referral.status === "PENDING" &&
          !referral.referredId &&
          referral.referrerId !== user.id
        ) {
          await prisma.$transaction([
            prisma.referral.update({
              where: { id: referral.id },
              data: {
                referredId: user.id,
                status: "COMPLETED",
                redeemedAt: new Date(),
              },
            }),
            prisma.user.update({
              where: { id: user.id },
              data: { referredById: referral.referrerId },
            }),
          ]);
          void sendReferralNotificationEmail(
            referral.referrer.email,
            referral.referralCode,
            name,
          );
        }
      } catch (err) {
        logger.warn("Referral redemption skipped", { requestId, err });
      }
    }

    logger.info("User registered", { requestId, email });
    return NextResponse.json(
      {
        message:
          "Account created. Please check your email to verify your account.",
        requiresVerification: true,
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("Registration error", { requestId, error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
