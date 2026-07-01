import { handlers } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";

// NextAuth exports GET (signin UI + callback) and POST (credential submit).
// We only want to throttle the credential POST; the GET UI render should be
// cached / free.
const { GET } = handlers;

async function POST(request: Request) {
  // 10 login attempts per IP per minute — comfortably above legitimate
  // retry behavior, well below credential-stuffing throughput.
  const limited = await enforceRateLimit(request, {
    limit: 10,
    windowSeconds: 60,
    identifierSuffix: "login",
  });
  if (limited) return limited;

  return handlers.POST(request);
}

export { GET, POST };
