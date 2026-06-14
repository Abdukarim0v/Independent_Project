"use client";

import { useTheme } from "@/components/theme-provider";
import { useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Sun, Moon, Monitor, UserCircle, Check, Percent, Loader2, Clock } from "lucide-react";
import { toast } from "sonner";
import type { Role } from "@prisma/client";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { updateBillingSettings, updateWorkHours } from "./actions";

const LOCALE_LABELS: Record<string, string> = { uz: "O'zbekcha", ru: "Русский", en: "English" };

type Settings = {
  discountPercent: number;
  serviceFeePercent: number;
  workStartMinute: number;
  workEndMinute: number;
};

function minutesToTime(min: number) {
  const h = Math.floor(min / 60)
    .toString()
    .padStart(2, "0");
  const m = (min % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function timeToMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function SettingsPanel({
  name,
  username,
  role,
  settings,
}: {
  name: string;
  username: string;
  role: Role;
  settings: Settings;
}) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const tr = useTranslations("roles");
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [discountPercent, setDiscountPercent] = useState(String(settings.discountPercent));
  const [serviceFeePercent, setServiceFeePercent] = useState(String(settings.serviceFeePercent));
  const [workStart, setWorkStart] = useState(minutesToTime(settings.workStartMinute));
  const [workEnd, setWorkEnd] = useState(minutesToTime(settings.workEndMinute));
  const [hoursPending, startHoursTransition] = useTransition();
  useEffect(() => setMounted(true), []);

  function saveBilling() {
    startTransition(async () => {
      try {
        await updateBillingSettings({ discountPercent, serviceFeePercent });
        toast.success(tc("saved"));
        router.refresh();
      } catch {
        toast.error(tc("error"));
      }
    });
  }

  function saveWorkHours() {
    startHoursTransition(async () => {
      try {
        await updateWorkHours({
          workStartMinute: timeToMinutes(workStart),
          workEndMinute: timeToMinutes(workEnd),
        });
        toast.success(tc("saved"));
        router.refresh();
      } catch {
        toast.error(tc("error"));
      }
    });
  }

  const themes: { key: "light" | "dark" | "system"; icon: typeof Sun; label: string }[] = [
    { key: "light", icon: Sun, label: t("light") },
    { key: "dark", icon: Moon, label: t("dark") },
    { key: "system", icon: Monitor, label: t("system") },
  ];

  return (
    <div className="grid max-w-3xl gap-6">
      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>{t("profile")}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserCircle className="h-10 w-10" />
          </span>
          <div>
            <p className="text-lg font-semibold">{name}</p>
            <p className="text-sm text-muted-foreground">@{username}</p>
            <Badge className="mt-1">{tr(role)}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle>{t("appearance")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-medium">{t("theme")}</p>
            <div className="grid grid-cols-3 gap-2">
              {themes.map((th) => (
                <button
                  key={th.key}
                  onClick={() => setTheme(th.key)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors",
                    mounted && theme === th.key ? "border-primary bg-primary/5" : "hover:bg-accent",
                  )}
                >
                  <th.icon className="h-6 w-6" />
                  <span className="text-sm">{th.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">{t("language")}</p>
            <div className="grid grid-cols-3 gap-2">
              {routing.locales.map((l) => (
                <button
                  key={l}
                  onClick={() => router.replace(pathname, { locale: l })}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-lg border-2 p-3 text-sm transition-colors",
                    l === locale ? "border-primary bg-primary/5" : "hover:bg-accent",
                  )}
                >
                  {l === locale && <Check className="h-4 w-4 text-primary" />}
                  {LOCALE_LABELS[l]}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing (admin only) */}
      {role === "ADMIN" && (
        <Card>
          <CardHeader>
            <CardTitle>{t("billing")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("billingHint")}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Percent className="h-4 w-4" /> {t("discountPercent")}
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Percent className="h-4 w-4" /> {t("serviceFeePercent")}
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={serviceFeePercent}
                  onChange={(e) => setServiceFeePercent(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={saveBilling} disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {tc("save")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Work hours (admin only) */}
      {role === "ADMIN" && (
        <Card>
          <CardHeader>
            <CardTitle>{t("workHours")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("workHoursHint")}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" /> {t("workStart")}
                </Label>
                <Input type="time" value={workStart} onChange={(e) => setWorkStart(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" /> {t("workEnd")}
                </Label>
                <Input type="time" value={workEnd} onChange={(e) => setWorkEnd(e.target.value)} />
              </div>
            </div>
            <Button onClick={saveWorkHours} disabled={hoursPending}>
              {hoursPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {tc("save")}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
