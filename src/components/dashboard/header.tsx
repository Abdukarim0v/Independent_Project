"use client";

import { signOut } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { LogOut, User as UserIcon } from "lucide-react";
import type { Role } from "@prisma/client";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header({ name, role }: { name: string; role: Role }) {
  const t = useTranslations("nav");
  const tr = useTranslations("roles");
  const locale = useLocale();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-end gap-1 border-b bg-card/80 px-4 pl-16 backdrop-blur md:pl-4">
      <LanguageSwitcher variant="ghost" />
      <ThemeToggle />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-2 pl-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">
              <UserIcon className="h-4 w-4" />
            </span>
            <span className="hidden text-left sm:block">
              <span className="block text-sm font-medium leading-tight">{name}</span>
              <span className="block text-xs text-muted-foreground leading-tight">{tr(role)}</span>
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>{name}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={async () => {
              await signOut({ redirect: false });
              window.location.href = `${window.location.origin}/${locale}/login`;
            }}
          >
            <LogOut className="h-4 w-4" />
            {t("logout")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
