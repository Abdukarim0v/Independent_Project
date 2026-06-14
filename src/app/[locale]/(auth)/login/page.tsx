"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ChefHat, Loader2, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LoginPage() {
  const t = useTranslations("login");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await signIn("credentials", { username, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError(res.code === "outside_hours" ? t("outsideHours") : t("error"));
      return;
    }
    router.push(`/${locale}`);
    router.refresh();
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/20 p-4">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-accent/30 blur-3xl" />

      <div className="absolute right-4 top-4 flex items-center gap-1">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>

      <div className="relative grid w-full max-w-4xl overflow-hidden rounded-2xl border bg-card shadow-2xl md:grid-cols-2">
        {/* Brand side */}
        <div className="hidden flex-col justify-between bg-sidebar p-8 text-sidebar-foreground md:flex">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <UtensilsCrossed className="h-6 w-6" />
            </div>
            <span className="text-lg font-bold">{tc("appName")}</span>
          </div>
          <div className="space-y-3">
            <ChefHat className="h-12 w-12 text-primary" />
            <h2 className="text-2xl font-bold leading-tight">{tc("appFull")}</h2>
            <p className="text-sm text-sidebar-muted">
              POS · Stollar · Oshxona · Menyu · Ombor · Hisobotlar
            </p>
          </div>
          <p className="text-xs text-sidebar-muted">© {new Date().getFullYear()} · Diplom loyihasi</p>
        </div>

        {/* Form side */}
        <div className="p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">{t("title")}</h1>
            <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">{t("username")}</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("password")}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("submit")}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
