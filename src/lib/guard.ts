import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { Role } from "@prisma/client";
import { canAccess, homeFor, type NavKey } from "@/lib/rbac";

/** Use inside Server Actions / Route Handlers. Throws if not authorized. */
export async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHENTICATED");
  return session.user;
}

export async function requireRole(roles: Role[]) {
  const user = await requireSession();
  if (!roles.includes(user.role)) throw new Error("FORBIDDEN");
  return user;
}

/** Use inside dashboard pages. Redirects to the user's home page if their role can't access this section. */
export async function requirePageAccess(locale: string, key: NavKey) {
  const user = await requireSession();
  if (!canAccess(user.role, key)) {
    const home = homeFor(user.role);
    redirect(`/${locale}/${home === "dashboard" ? "" : home}`);
  }
  return user;
}
