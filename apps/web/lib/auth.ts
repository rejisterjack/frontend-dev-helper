import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { authConfig } from "./auth.config";
import { prisma } from "./db";

const LINK_COOKIE = "fdh-oauth-link";

/**
 * Full NextAuth setup for Node-runtime contexts (route handlers, server
 * components, the credentials `authorize` callback).
 *
 * Edge-runtime code (notably `middleware.ts`) MUST NOT import this file — it
 * transitively pulls in Prisma (`node:*` modules) and bcrypt, neither of
 * which the Edge runtime can resolve. Edge code imports `lib/auth.config.ts`
 * instead, which contains the edge-safe subset (providers list + the
 * `authorized` callback).
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    authorized: authConfig.callbacks?.authorized,

    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id!;
        token.email = user.email!;
        token.emailVerified = user.emailVerified ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        const t = token as { userId: string; emailVerified: boolean };
        session.user.id = t.userId;
        (session.user as { emailVerified: boolean }).emailVerified =
          t.emailVerified;
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      if (
        !account ||
        (account.provider !== "google" && account.provider !== "github")
      ) {
        return true;
      }

      if (!user?.email) return false;

      const existingUser = await prisma.user.findUnique({
        where: { email: user.email },
      });

      if (!existingUser) {
        await prisma.user.create({
          data: {
            email: user.email,
            name: user.name,
            avatarUrl: user.image,
            oauthProvider: account.provider,
            oauthId: account.providerAccountId,
            emailVerified: true,
          },
        });
        return true;
      }

      const sameOAuthIdentity =
        existingUser.oauthProvider === account.provider &&
        existingUser.oauthId === account.providerAccountId;

      if (sameOAuthIdentity) {
        const avatarFromProfile = (profile as Record<string, unknown> | null)
          ?.image as string | undefined;
        if (avatarFromProfile && avatarFromProfile !== existingUser.avatarUrl) {
          await prisma.user.update({
            where: { id: existingUser.id },
            data: { avatarUrl: avatarFromProfile },
          });
        }
        return true;
      }

      // Explicit dashboard link: cookie set by POST /api/auth/prepare-link.
      try {
        const jar = await cookies();
        const link = jar.get(LINK_COOKIE)?.value;
        if (link) {
          const [linkUserId, linkProvider] = link.split(":");
          jar.delete(LINK_COOKIE);
          if (
            linkUserId === existingUser.id &&
            linkProvider === account.provider &&
            existingUser.passwordHash &&
            !existingUser.oauthProvider
          ) {
            await prisma.user.update({
              where: { id: existingUser.id },
              data: {
                oauthProvider: account.provider,
                oauthId: account.providerAccountId,
                avatarUrl: user.image ?? existingUser.avatarUrl,
                emailVerified: true,
              },
            });
            return true;
          }
        }
      } catch {
        // cookies() may throw outside a request context — fall through.
      }

      // Refuse silent linking — prevents OAuth takeover of credentials accounts.
      return false;
    },
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const user = await prisma.user.findUnique({
          where: { email },
        });

        const placeholderHash =
          "$2a$12$00000000000000000000000000000000000000000000000000000001";
        const hashToCompare = user?.passwordHash ?? placeholderHash;
        const isValid = await bcrypt.compare(password, hashToCompare);

        if (!user || !user.passwordHash || !isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified,
        };
      },
    }),
    ...(authConfig.providers ?? []),
  ],
});

declare module "next-auth" {
  interface User {
    emailVerified?: boolean;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      emailVerified: boolean;
    };
  }
}

declare module "next-auth" {
  interface JWT {
    userId: string;
    emailVerified: boolean;
  }
}
