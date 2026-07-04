import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";
import { prisma } from "./db";

/**
 * Full NextAuth setup for Node-runtime contexts (route handlers, server
 * components, the credentials `authorize` callback).
 *
 * Edge-runtime code (notably `middleware.ts`) MUST NOT import this file — it
 * transitively pulls in Prisma (`node:*` modules) and bcrypt, neither of
 * which the Edge runtime can resolve. Edge code imports `lib/auth.config.ts`
 * instead, which contains the edge-safe subset (providers list + the
 * `authorized` callback).
 *
 * NextAuth's `NextAuth(config)` merges the config from `authConfig` with the
 * additional callbacks defined here. The callbacks defined here override
 * their namesakes in `authConfig` (so the `authorized` callback in
 * `authConfig` keeps running in middleware; the `signIn` / `jwt` / `session`
 * callbacks defined here run in the Node runtime).
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    // Carry forward the edge-safe `authorized` callback so types stay in sync.
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
        // Cast through the augmented JWT type — TS sometimes fails to merge
        // the module augmentation when strict mode + Next.js plugin interact.
        const t = token as { userId: string; emailVerified: boolean };
        session.user.id = t.userId;
        // Force-override emailVerified; the base Session.user type from
        // @auth/core types it as `Date | string | null`, but we store and
        // propagate a boolean.
        (session.user as { emailVerified: boolean }).emailVerified =
          t.emailVerified;
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      // Only run linking/creation logic for OAuth providers.
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
        // No user yet — provision one. OAuth providers have already verified
        // the email at the IdP, so we stamp emailVerified: true.
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

      // Existing user. Decide whether to allow this OAuth sign-in.
      const sameOAuthIdentity =
        existingUser.oauthProvider === account.provider &&
        existingUser.oauthId === account.providerAccountId;

      if (sameOAuthIdentity) {
        // Returning OAuth user — allow. Refresh avatar from profile.
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

      // The email matches a user that did NOT sign in with this OAuth identity.
      // Refuse to link automatically — that would let anyone controlling a
      // matching-email OAuth identity take over the credentials account.
      // The user must sign in with their existing credentials and link the
      // OAuth account explicitly from the dashboard (TODO: build that flow).
      // Returning `false` redirects to /login?error=OAuthAccountNotLinked.
      return false;
    },
  },
  providers: [
    // Credentials provider lives here (not in auth.config.ts) because it
    // transitively imports Prisma + bcrypt — Node-only.
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

        // Always run a bcrypt compare against a throwaway hash when the user
        // doesn't exist so the failure path takes the same time as the
        // success path (mitigates user-enumeration via timing).
        const placeholderHash =
          "$2a$12$00000000000000000000000000000000000000000000000000000001";
        const hashToCompare = user?.passwordHash ?? placeholderHash;
        const isValid = await bcrypt.compare(password, hashToCompare);

        if (!user || !user.passwordHash || !isValid) {
          return null;
        }

        // Email verification is enforced by the `authorized` callback in
        // lib/auth.config.ts: unverified users get a session (so they can hit
        // /verify-email to resend the link) but are redirected away from any
        // protected route.
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified,
        };
      },
    }),
    // The OAuth providers from `authConfig` are inherited via the spread
    // above; we don't re-declare them here. (Adding Credentials via the
    // providers array here would replace the inherited array, so we list
    // them all together.)
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
