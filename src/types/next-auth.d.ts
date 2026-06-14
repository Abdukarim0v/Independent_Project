import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      role: Role;
    } & DefaultSession["user"];
  }

  interface User {
    username: string;
    role: Role;
    locale?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: Role;
    username: string;
  }
}
