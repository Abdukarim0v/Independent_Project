import type { Role } from "@prisma/client";

export type NavKey =
  | "dashboard"
  | "pos"
  | "tables"
  | "kitchen"
  | "menu"
  | "inventory"
  | "reports"
  | "staff"
  | "settings";

/** Which roles may access each section. */
export const ACCESS: Record<NavKey, Role[]> = {
  dashboard: ["ADMIN", "MANAGER"],
  pos: ["ADMIN", "MANAGER", "WAITER", "CASHIER"],
  tables: ["ADMIN", "MANAGER", "WAITER", "CASHIER"],
  kitchen: ["ADMIN", "MANAGER", "COOK"],
  menu: ["ADMIN", "MANAGER"],
  inventory: ["ADMIN", "MANAGER"],
  reports: ["ADMIN", "MANAGER"],
  staff: ["ADMIN"],
  settings: ["ADMIN", "MANAGER", "WAITER", "COOK", "CASHIER"],
};

export function canAccess(role: Role, key: NavKey): boolean {
  return ACCESS[key].includes(role);
}

/** Default landing section for a role after login. */
export function homeFor(role: Role): NavKey {
  switch (role) {
    case "COOK":
      return "kitchen";
    case "WAITER":
      return "tables";
    case "CASHIER":
      return "tables";
    default:
      return "dashboard";
  }
}
