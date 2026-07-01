import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import bcrypt from "bcryptjs";
import { prisma } from "./db";

export const { handlers, auth, signIn, signOut } = NextAuth({
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

        if (!user || !user.passwordHash) {
          return null;
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
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
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (user) {
        token.userId = user.id!;
        token.email = user.email!;
        token.emailVerified = user.emailVerified ?? false;

        // For OAuth providers, create or link account
        if (account) {
          const dbUser = await prisma.user.findUnique({
            where: { email: user.email! },
          });

          token.emailVerified = dbUser?.emailVerified ?? false;

          if (dbUser && !dbUser.oauthProvider) {
            await prisma.user.update({
              where: { id: dbUser.id },
              data: {
                oauthProvider: account.provider,
                oauthId: account.providerAccountId,
                emailVerified: true,
                avatarUrl:
                  ((profile as Record<string, unknown>)?.image as
                    | string
                    | undefined) ?? dbUser.avatarUrl,
              },
            });
            token.emailVerified = true;
          }
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        // `session.user` is augmented via the module declaration at the
        // bottom of this file — no cast needed.
        session.user.id = token.userId;
        session.user.emailVerified = token.emailVerified;
      }
      return session;
    },
    async signIn({ user, account }) {
      if (
        account &&
        (account.provider === "google" || account.provider === "github")
      ) {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! },
        });

        if (!existingUser) {
          await prisma.user.create({
            data: {
              email: user.email!,
              name: user.name,
              avatarUrl: user.image,
              oauthProvider: account.provider,
              oauthId: account.providerAccountId,
              emailVerified: true,
            },
          });
        }
      }

      return true;
    },
  },
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
