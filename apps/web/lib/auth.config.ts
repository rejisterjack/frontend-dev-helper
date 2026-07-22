import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";

/**
 * Edge-safe NextAuth configuration.
 *
 * This file is imported by `middleware.ts` (which runs in the Edge runtime)
 * and contains everything NextAuth needs to make the `authorized` decision
 * and to enumerate providers — but NOTHING that pulls in Node-only modules
 * (no Prisma, no bcrypt). The Edge runtime cannot resolve `node:*` imports,
 * so anything database- or crypto- related has to live in `lib/auth.ts`
 * instead, which is only imported from Node-runtime contexts (route handlers,
 * server components).
 *
 * `lib/auth.ts` extends this config with the Credentials provider, callbacks
 * that touch the database, etc.
 */

const isOAuthEnabled = (
  id: string | undefined,
  secret: string | undefined,
): boolean => Boolean(id && secret);

export const authConfig: NextAuthConfig = {
  providers: [
    ...(isOAuthEnabled(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
    )
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          }),
        ]
      : []),
    ...(isOAuthEnabled(
      process.env.GITHUB_CLIENT_ID,
      process.env.GITHUB_CLIENT_SECRET,
    )
      ? [
          GitHub({
            clientId: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
          }),
        ]
      : []),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    // The `authorized` callback runs in the Edge runtime (middleware). It only
    // inspects the session, no DB calls, so it's safe here.
    authorized({ request, auth: session }) {
      const path = request.nextUrl.pathname;
      const protectedPrefixes = ["/dashboard"];

      if (protectedPrefixes.some((p) => path.startsWith(p))) {
        if (!session?.user) {
          return false;
        }
        if (!session.user.emailVerified) {
          return Response.redirect(new URL("/verify-email", request.url));
        }
      }
      return true;
    },
  },
};
