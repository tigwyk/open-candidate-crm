import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// A precomputed bcrypt hash of a value nobody will ever type, used to keep
// the "user not found" path taking roughly as long as a real password check —
// otherwise the early return leaks which emails are registered via timing.
const DUMMY_PASSWORD_HASH = "$2b$10$20MMaWM1Mx0iSa.90at87O63sZ1h4Puz3aVARB3snJTUZt98dCyfO";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;

        const ip = getClientIp(new Headers(req?.headers as Record<string, string> | undefined));
        if (!checkRateLimit(`login:${credentials.email.toLowerCase()}`, { max: 10, windowMs: 15 * 60_000 })) {
          return null;
        }
        if (!checkRateLimit(`login-ip:${ip}`, { max: 30, windowMs: 15 * 60_000 })) {
          return null;
        }

        const user = await db.user.findUnique({ where: { email: credentials.email } });
        if (!user) {
          // Run a real bcrypt compare against a dummy hash so this path takes
          // comparable time to a wrong-password attempt on a real account.
          await bcrypt.compare(credentials.password, DUMMY_PASSWORD_HASH);
          return null;
        }

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.uid = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.id = token.uid as string;
      return session;
    },
  },
};
