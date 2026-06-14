"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { UtensilsCrossed, Menu, X } from "lucide-react";
import type { Role } from "@prisma/client";
import { NAV } from "./nav-items";
import { canAccess } from "@/lib/rbac";
import { cn } from "@/lib/utils";

export function Sidebar({ role }: { role: Role }) {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const base = `/${locale}`;
  const items = NAV.filter((n) => canAccess(role, n.key));

  function isActive(href: string) {
    const full = href ? `${base}/${href}` : base;
    if (!href) return pathname === base || pathname === `${base}/`;
    return pathname === full || pathname.startsWith(`${full}/`);
  }

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
      {items.map(({ key, href, icon: Icon }) => (
        <Link
          key={key}
          href={href ? `${base}/${href}` : base}
          onClick={() => setOpen(false)}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            isActive(href)
              ? "bg-sidebar-accent text-white shadow-sm"
              : "text-sidebar-muted hover:bg-white/5 hover:text-sidebar-foreground",
          )}
        >
          <Icon className="h-5 w-5 shrink-0" />
          {t(key)}
        </Link>
      ))}
    </nav>
  );

  const brand = (
    <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <UtensilsCrossed className="h-5 w-5" />
      </div>
      <span className="text-base font-bold text-sidebar-foreground">{tc("appName")}</span>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(true)}
        className="fixed left-4 top-3 z-30 rounded-md border bg-card p-2 shadow-sm md:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Desktop */}
      <aside className="hidden w-64 shrink-0 flex-col bg-sidebar md:flex">
        {brand}
        {nav}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col bg-sidebar animate-fade-in">
            <div className="flex items-center justify-between border-b border-sidebar-border px-5 h-16">
              <span className="font-bold text-sidebar-foreground">{tc("appName")}</span>
              <button onClick={() => setOpen(false)} className="text-sidebar-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
            {nav}
          </aside>
        </div>
      )}
    </>
  );
}
