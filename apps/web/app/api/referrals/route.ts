import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { auth } from '@/lib/auth';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    const referrals = await prisma.referral.findMany({
      where: { referrerId: userId },
      include: {
        referred: {
          select: { id: true, email: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return Response.json({
      referrals: referrals.map((r) => ({
        id: r.id,
        referralCode: r.referralCode,
        status: r.status,
        reward: r.reward,
        referred: r.referred
          ? { email: r.referred.email, name: r.referred.name }
          : null,
        createdAt: r.createdAt,
        redeemedAt: r.redeemedAt,
      })),
    });
  } catch (error) {
    logger.error('Get referrals error:', error);
    return Response.json({ error: 'Failed to get referrals' }, { status: 500 });
  }
}
