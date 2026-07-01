import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

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
      async authorize(credentials) {
        // ADMIN_PASSWORD_HASH must have its `$` characters escaped as `\$` in
        // .env — Next.js's env loader does shell-style $VAR expansion, which
        // otherwise mangles bcrypt hashes (they're full of `$` delimiters).
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
        if (!adminEmail || !adminPasswordHash) {
          throw new Error("Admin credentials are not configured");
        }
        if (!credentials?.email || !credentials?.password) return null;
        if (credentials.email !== adminEmail) return null;

        const valid = await bcrypt.compare(credentials.password, adminPasswordHash);
        if (!valid) return null;

        return { id: "admin", email: adminEmail };
      },
    }),
  ],
};
