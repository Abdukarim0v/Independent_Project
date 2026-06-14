import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DollarSign, ShoppingBag, Receipt, Armchair, TrendingUp, AlertTriangle, Package, Trophy } from "lucide-react";
import { auth } from "@/auth";
import { getDashboard } from "@/lib/analytics";
import { tx, formatMoney, formatNumber } from "@/lib/utils";
import { homeFor } from "@/lib/rbac";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RevenueAreaChart, CategoryDonut } from "@/components/charts";

export const dynamic = "force-dynamic";

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: routeLocale } = await params;
  const session = await auth();
  const role = session?.user?.role;
  if (role && role !== "ADMIN" && role !== "MANAGER") {
    const home = homeFor(role);
    redirect(`/${routeLocale}/${home === "dashboard" ? "" : home}`);
  }

  const t = await getTranslations("dashboard");
  const tos = await getTranslations("orderStatus");
  const locale = await getLocale();
  const d = await getDashboard();

  const stats = [
    { label: t("revenueToday"), value: formatMoney(d.revenueToday), icon: DollarSign, color: "text-chart-1 bg-chart-1/10" },
    { label: t("ordersToday"), value: String(d.ordersToday), icon: ShoppingBag, color: "text-chart-2 bg-chart-2/10" },
    { label: t("avgCheck"), value: formatMoney(d.avgCheck), icon: Receipt, color: "text-chart-3 bg-chart-3/10" },
    { label: t("activeTables"), value: String(d.occupied), icon: Armchair, color: "text-chart-4 bg-chart-4/10" },
  ];

  const categoryData = d.byCategory.map((c) => ({ name: tx(c.name, locale), revenue: c.revenue }));

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title={t("title")} />

      {/* KPI cards */}
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
        {/* revenue trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" /> {t("salesTrend")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueAreaChart data={d.salesTrend} />
          </CardContent>
        </Card>

        {/* category donut */}
        <Card>
          <CardHeader>
            <CardTitle>{t("byCategory")}</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length ? (
              <>
                <CategoryDonut data={categoryData} />
                <div className="mt-2 space-y-1">
                  {categoryData.slice(0, 5).map((c, i) => (
                    <div key={c.name} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ background: `var(--chart-${(i % 5) + 1})` }} />
                        {c.name}
                      </span>
                      <span className="font-medium">{formatMoney(c.revenue)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="py-12 text-center text-muted-foreground">{t("allGood")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* top dishes */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-warning" /> {t("topDishes")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {d.topDishes.length ? (
              d.topDishes.map((dish, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border p-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="flex-1 truncate font-medium">{tx(dish.name, locale)}</span>
                  <Badge variant="secondary">×{dish.qty}</Badge>
                  <span className="w-28 text-right font-semibold text-primary">{formatMoney(dish.revenue)}</span>
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-muted-foreground">{t("allGood")}</p>
            )}
          </CardContent>
        </Card>

        {/* low stock */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> {t("lowStock")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {d.lowStock.length ? (
              d.lowStock.map((i) => (
                <div key={i.id} className="flex items-center justify-between rounded-lg bg-destructive/5 p-2 text-sm">
                  <span className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-destructive" /> {tx(i.name, locale)}
                  </span>
                  <span className="font-medium text-destructive">
                    {formatNumber(i.stockQty)} {i.unit}
                  </span>
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-success">{t("allGood")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* recent orders */}
      <Card>
        <CardHeader>
          <CardTitle>{t("recentOrders")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {d.recentOrders.map((o) => (
            <Link
              key={o.id}
              href={`/${locale}/payment?order=${o.id}`}
              className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:border-primary"
            >
              <span className="font-bold">#{o.number}</span>
              {o.tableNumber && <span className="text-muted-foreground">· {o.tableNumber}</span>}
              <Badge variant={o.status === "PAID" ? "success" : o.status === "READY" ? "info" : "warning"}>
                {tos(o.status)}
              </Badge>
              <span className="font-medium text-primary">{formatMoney(o.total)}</span>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
