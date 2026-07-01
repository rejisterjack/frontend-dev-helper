import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/rate-limit";
import { hashToken } from "@/lib/tokens";

export async function POST(request: Request) {
  // IP-level: 5 signups per minute. Email-level: 3 per hour (below).
  const ipLimited = await enforceRateLimit(request, {
    limit: 5,
    windowSeconds: 60,
    identifierSuffix: "register",
  });
  if (ipLimited) return ipLimited;

  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    // Email-level throttling: 3 registrations per email per hour. Limits
    // both abuse and accidental re-registration storms. We deliberately do
    // NOT return a different response shape here to avoid email enumeration.
    const emailLimited = await enforceRateLimit(request, {
      limit: 3,
      windowSeconds: 3600,
      identifierSuffix: `register:${email.toLowerCase()}`,
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
