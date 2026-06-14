import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { startOfDay, endOfDay, subDays } from "date-fns";
import { TrendingUp, DollarSign, Wallet, ShoppingBag, Banknote, CreditCard, Users } from "lucide-react";
import { getReports } from "@/lib/analytics";
import { tx, formatMoney, cn } from "@/lib/utils";
import { requirePageAccess } from "@/lib/guard";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CategoryBarChart } from "@/components/charts";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

const PERIODS = [
  { key: "day", days: 1 },
  { key: "week", days: 7 },
  { key: "month", days: 30 },
] as const;

export default async function ReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const { locale } = await params;
  await requirePageAccess(locale, "reports");
  const t = await getTranslations("reports");
  const tpay = await getTranslations("payment");
  const { period = "week", from, to } = await searchParams;

  // Erkin sana oralig'i preset'dan ustun
  const custom = Boolean(from && to);
  const since = custom ? startOfDay(new Date(from!)) : startOfDay(subDays(new Date(), (PERIODS.find((p) => p.key === period)?.days ?? 7) - 1));
  const until = custom ? endOfDay(new Date(to!)) : endOfDay(new Date());
  const r = await getReports(since, until);

  const stats = [
    { label: t("revenue"), value: formatMoney(r.revenue), icon: DollarSign, color: "text-chart-1 bg-chart-1/10" },
    { label: t("profit"), value: formatMoney(r.profit), icon: TrendingUp, color: "text-chart-3 bg-chart-3/10" },
    { label: t("cost"), value: formatMoney(r.cost), icon: Wallet, color: "text-chart-4 bg-chart-4/10" },
    { label: t("orders"), value: String(r.orders), icon: ShoppingBag, color: "text-chart-2 bg-chart-2/10" },
  ];

  const categoryData = r.byCategory.map((c) => ({ name: tx(c.name, locale), revenue: c.revenue }));

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title={t("title")}
        action={
          <div className="no-print flex flex-wrap items-center gap-2">
            <div className="flex gap-1 rounded-lg bg-muted p-1">
              {PERIODS.map((p) => (
                <Link
                  key={p.key}
                  href={`/${locale}/reports?period=${p.key}`}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    !custom && period === p.key ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t(p.key)}
                </Link>
              ))}
            </div>
            <form method="get" action={`/${locale}/reports`} className="flex items-center gap-1">
              <input
                type="date"
                name="from"
                defaultValue={from}
                className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
              />
              <span className="text-muted-foreground">–</span>
              <input
                type="date"
                name="to"
                defaultValue={to}
                className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
              />
              <button
                type="submit"
                className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
              >
                {t("apply")}
              </button>
            </form>
            <PrintButton label={t("print")} />
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${s.color}`}>
                <s.icon className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm text-muted-foreground">{s.label}</p>
                <p className="truncate text-xl font-bold">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("salesByCategory")}</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length ? (
              <CategoryBarChart data={categoryData} />
            ) : (
              <p className="py-12 text-center text-muted-foreground">—</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("revenue")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-success/5 p-3">
              <span className="flex items-center gap-2 text-sm">
                <Banknote className="h-4 w-4 text-success" /> {tpay("cash")}
              </span>
              <span className="font-semibold">{formatMoney(r.cash)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-info/5 p-3">
              <span className="flex items-center gap-2 text-sm">
                <CreditCard className="h-4 w-4 text-info" /> {tpay("card")}
              </span>
              <span className="font-semibold">{formatMoney(r.card)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" /> {t("staffPerf")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {r.byWaiter.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="p-2">{t("waiter")}</th>
                    <th className="p-2 text-right">{t("orders")}</th>
                    <th className="p-2 text-right">{t("avgCheck")}</th>
                    <th className="p-2 text-right">{t("revenue")}</th>
                  </tr>
                </thead>
                <tbody>
                  {r.byWaiter.map((w, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="p-2 font-medium">{w.name}</td>
                      <td className="p-2 text-right">{w.orders}</td>
                      <td className="p-2 text-right text-muted-foreground">{formatMoney(w.avgCheck)}</td>
                      <td className="p-2 text-right font-semibold text-primary">{formatMoney(w.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-8 text-center text-muted-foreground">—</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("topDishes")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {r.topDishes.length ? (
            r.topDishes.map((d, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border p-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {i + 1}
                </span>
                <span className="flex-1 truncate font-medium">{tx(d.name, locale)}</span>
                <Badge variant="secondary">×{d.qty}</Badge>
                <span className="w-28 text-right font-semibold text-primary">{formatMoney(d.revenue)}</span>
              </div>
            ))
          ) : (
            <p className="py-8 text-center text-muted-foreground">—</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
