import {
  LayoutDashboard,
  ShoppingCart,
  Armchair,
  ChefHat,
  BookOpenText,
  Package,
  BarChart3,
  Users,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { NavKey } from "@/lib/rbac";

export const NAV: { key: NavKey; href: string; icon: LucideIcon }[] = [
  { key: "dashboard", href: "", icon: LayoutDashboard },
  { key: "tables", href: "tables", icon: Armchair },
  { key: "pos", href: "pos", icon: ShoppingCart },
  { key: "kitchen", href: "kitchen", icon: ChefHat },
  { key: "menu", href: "menu", icon: BookOpenText },
  { key: "inventory", href: "inventory", icon: Package },
  { key: "reports", href: "reports", icon: BarChart3 },
  { key: "staff", href: "staff", icon: Users },
  { key: "settings", href: "settings", icon: Settings },
];
