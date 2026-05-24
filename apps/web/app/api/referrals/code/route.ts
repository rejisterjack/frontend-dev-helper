import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { auth } from '@/lib/auth';

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Check if user already has a referral code
    const existing = await prisma.referral.findFirst({
      where: { referrerId: userId },
    });

    if (existing) {
      return Response.json({ referralCode: existing.referralCode });
    }

    // Generate a unique code
    let code: string | undefined;
    let attempts = 0;
    while (attempts < 10) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let segment = '';
      for (let i = 0; i < 5; i++) {
        segment += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      code = `FDH-${segment}`;

      const taken = await prisma.referral.findUnique({ where: { referralCode: code } });
      if (!taken) break;
      attempts++;
    }

    const referral = await prisma.referral.create({
      data: {
        referrerId: userId,
        referralCode: code!,
        status: 'PENDING',
      },
    });

    logger.info(`Referral code generated for user ${userId}: ${referral.referralCode}`);

    return Response.json({ referralCode: referral.referralCode }, { status: 201 });
  } catch (error) {
    logger.error('Generate referral code error:', error);
    return Response.json({ error: 'Failed to generate referral code' }, { status: 500 });
  }
}
