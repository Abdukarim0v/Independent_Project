import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { CredentialsSignin } from "@auth/core/errors";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { getSettings, isWithinWorkHours } from "@/lib/settings";
import type { Role } from "@prisma/client";

class OutsideWorkHoursError extends CredentialsSignin {
  code = "outside_hours";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const username = credentials?.username as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!username || !password) return null;

        const user = await db.user.findUnique({ where: { username } });
        if (!user || !user.isActive) return null;

        const ok = bcrypt.compareSync(password, user.passwordHash);
        if (!ok) return null;

        if (user.role !== "ADMIN" && user.role !== "MANAGER") {
          const settings = await getSettings();
          const startMinute = user.workStartMinute ?? settings.workStartMinute;
          const endMinute = user.workEndMinute ?? settings.workEndMinute;
          if (!isWithinWorkHours(new Date(), startMinute, endMinute)) {
            throw new OutsideWorkHoursError();
          }
        }

        return {
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.role,
          locale: user.locale,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: Role }).role;
        token.username = (user as { username: string }).username;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        const exists = await db.user.findUnique({ where: { id: token.sub }, select: { id: true } });
        if (!exists) {
          // Stale session from before a db reseed (user id no longer exists) — force re-login
          return { ...session, user: undefined as never, expires: new Date(0).toISOString() };
        }
        session.user.id = token.sub;
        session.user.role = token.role as Role;
        session.user.username = token.username as string;
      }
      return session;
    },
  },
});
