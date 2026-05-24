import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const schema = z.object({ token: z.string() });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token } = schema.parse(body);

    const verification = await prisma.emailVerification.findUnique({
      where: { token },
    });

    if (!verification) {
      return Response.json({ error: 'Invalid verification token' }, { status: 400 });
    }

    if (verification.expiresAt < new Date()) {
      await prisma.emailVerification.delete({ where: { id: verification.id } });
      return Response.json({ error: 'Verification token expired' }, { status: 400 });
    }

    // Mark email as verified
    await prisma.user.update({
      where: { id: verification.userId },
      data: { emailVerified: true },
    });

    // Remove used token
    await prisma.emailVerification.delete({ where: { id: verification.id } });

    logger.info(`Email verified: user ${verification.userId}`);

    return Response.json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    logger.error('Email verification error:', error);
    return Response.json({ error: 'Verification failed' }, { status: 500 });
  }
}
