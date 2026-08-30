import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";

const LINK_COOKIE = "fdh-oauth-link";
const LINK_MAX_AGE_SEC = 600;

/**
 * Marks the current session as intending to link an OAuth provider.
 * Call before `signIn(provider)` from the dashboard.
 */
export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, {
    limit: 10,
    windowSeconds: 60,
    identifierSuffix: "prepare-link",
  });
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    provider?: string;
  };
  const provider = body.provider;
  if (provider !== "google" && provider !== "github") {
    return Response.json({ error: "Invalid provider" }, { status: 400 });
  }

  const jar = await cookies();
  jar.set(LINK_COOKIE, `${session.user.id}:${provider}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: LINK_MAX_AGE_SEC,
  });

  return Response.json({ ok: true });
}
