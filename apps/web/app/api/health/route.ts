import { prisma } from '@/lib/db';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: 'healthy', db: 'ok', timestamp: new Date().toISOString() });
  } catch {
    return Response.json({ status: 'degraded', db: 'unreachable' }, { status: 503 });
  }
}
