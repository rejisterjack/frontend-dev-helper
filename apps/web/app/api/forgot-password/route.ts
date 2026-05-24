import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { sendPasswordResetEmail } from '@/lib/email';
import { randomBytes } from 'crypto';
import { z } from 'zod';

const schema = z.object({ email: z.string().email() });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = schema.parse(body);

    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration
    if (!user || !user.passwordHash) {
      return Response.json({ success: true, message: 'If an account exists, a reset link will be sent' });
    }

    const resetToken = randomBytes(32).toString('hex');
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry: resetExpiry },
    });

    await sendPasswordResetEmail(email, resetToken, user.name || undefined);

    return Response.json({
      success: true,
      message: 'If an account exists, a reset link will be sent',
      // Include token in dev for testing
      ...(process.env.NODE_ENV !== 'production' && { resetToken }),
    });
  } catch (error) {
    logger.error('Forgot password error:', error);
    return Response.json({ error: 'Request failed' }, { status: 500 });
  }
}
