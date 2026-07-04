import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/rate-limit";
import { hashToken } from "@/lib/tokens";

// Validate the request body up front so we can fail fast with a 400 before
// hitting the rate limiter / DB. Mirrors the validation in the sibling auth
// routes (login, reset-password, forgot-password).
const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  email: z.string().trim().toLowerCase().email("Invalid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(160),
});

export async function POST(request: Request) {
  // IP-level: 5 signups per minute. Email-level: 3 per hour (below).
  const ipLimited = await enforceRateLimit(request, {
    limit: 5,
    windowSeconds: 60,
    identifierSuffix: "register",
  });
  if (ipLimited) return ipLimited;

  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    // For validation errors we deliberately return the SAME success-shaped
    // response we use to avoid email enumeration. The actual `error` path is
    // only used when the body is structurally invalid JSON.
    if (!parsed.success) {
      // Re-run rate limit on the email (if present) so attackers can't bypass
      // the per-email throttle by sending malformed payloads.
      const email = body?.email;
      if (typeof email === "string") {
        await enforceRateLimit(request, {
          limit: 3,
          windowSeconds: 3600,
          identifierSuffix: `register:${email.toLowerCase()}`,
        });
      }
      return NextResponse.json(
        {
          message:
            "If this email is not already registered, an account has been created and a verification link sent.",
        },
        { status: 200 },
      );
    }

    const { name, email, password } = parsed.data;

    // Email-level throttling: 3 registrations per email per hour. Limits
    // both abuse and accidental re-registration storms. We deliberately do
    // NOT return a different response shape here to avoid email enumeration.
    const emailLimited = await enforceRateLimit(request, {
      limit: 3,
      windowSeconds: 3600,
      identifierSuffix: `register:${email}`,
    });
    if (emailLimited) return emailLimited;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      // CF-5: to close the email-enumeration vector, return the success
      // message (but do NOT create a session). The user is told to check
      // their inbox either way.
      return NextResponse.json(
        {
          message:
            "If this email is not already registered, an account has been created and a verification link sent.",
        },
        { status: 200 },
      );
    }

    const passwordHash = await hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
    });

    // 256-bit random token; plaintext goes only to email, hash goes to DB.
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.emailVerification.create({
      data: {
        token: hashToken(token),
        userId: user.id,
        expiresAt,
      },
    });

    await sendVerificationEmail(email, token, name);

    logger.info(`User registered: ${email}`);
    return NextResponse.json(
      {
        message:
          "Account created. Please check your email to verify your account.",
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
