import { startOfDay, subDays, format } from "date-fns";
import { db } from "@/lib/db";

type Localized = Record<string, string>;

/** KPIs + chart data for the dashboard overview. */
export async function getDashboard() {
  const today = startOfDay(new Date());
  const weekAgo = subDays(today, 6);

  const [paysToday, occupied, ingredients, weekPays, recent] = await Promise.all([
    db.payment.findMany({ where: { paidAt: { gte: today } } }),
    db.restaurantTable.count({ where: { status: "OCCUPIED" } }),
    db.ingredient.findMany(),
    db.payment.findMany({ where: { paidAt: { gte: weekAgo } }, select: { amount: true, paidAt: true } }),
    db.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { table: true },
    }),
  ]);

  const revenueToday = paysToday.reduce((s, p) => s + Number(p.amount), 0);
  const ordersToday = paysToday.length;
  const avgCheck = ordersToday ? revenueToday / ordersToday : 0;

  const lowStock = ingredients
    .filter((i) => Number(i.stockQty) <= Number(i.minQty))
    .map((i) => ({ id: i.id, name: i.name as Localized, stockQty: Number(i.stockQty), unit: i.unit }));

  // 7-day trend
  const byDay = new Map<string, number>();
  for (let d = 0; d < 7; d++) {
    byDay.set(format(subDays(today, 6 - d), "yyyy-MM-dd"), 0);
  }
  for (const p of weekPays) {
    const key = format(startOfDay(p.paidAt), "yyyy-MM-dd");
    if (byDay.has(key)) byDay.set(key, (byDay.get(key) ?? 0) + Number(p.amount));
  }
  const salesTrend = Array.from(byDay.entries()).map(([date, revenue]) => ({
    date: format(new Date(date), "dd/MM"),
    revenue,
  }));

  // top dishes (paid orders)
  const items = await db.orderItem.findMany({
    where: { order: { status: "PAID" } },
    include: { menuItem: { include: { category: true } } },
  });
  const dishMap = new Map<string, { name: Localized; qty: number; revenue: number }>();
  const catMap = new Map<string, { name: Localized; revenue: number }>();
  for (const it of items) {
    const rev = Number(it.unitPrice) * it.qty;
    const d = dishMap.get(it.menuItemId) ?? { name: it.menuItem.name as Localized, qty: 0, revenue: 0 };
    d.qty += it.qty;
    d.revenue += rev;
    dishMap.set(it.menuItemId, d);
    const c = catMap.get(it.menuItem.categoryId) ?? { name: it.menuItem.category.name as Localized, revenue: 0 };
    c.revenue += rev;
    catMap.set(it.menuItem.categoryId, c);
  }
  const topDishes = Array.from(dishMap.values()).sort((a, b) => b.qty - a.qty).slice(0, 5);
  const byCategory = Array.from(catMap.values()).sort((a, b) => b.revenue - a.revenue);

  return {
    revenueToday,
    ordersToday,
    avgCheck,
    occupied,
    lowStock,
    salesTrend,
    topDishes,
    byCategory,
    recentOrders: recent.map((o) => ({
      id: o.id,
      number: o.number,
      status: o.status,
      total: Number(o.total),
      tableNumber: o.table?.number ?? null,
    })),
  };
}

/** Aggregated report for a date range [since, until]. */
export async function getReports(since: Date, until: Date) {
  const [pays, outMoves, items, paidOrders] = await Promise.all([
    db.payment.findMany({
      where: { paidAt: { gte: since, lte: until } },
      select: { amount: true, method: true },
    }),
    db.stockMovement.findMany({
      where: { type: "OUT", createdAt: { gte: since, lte: until } },
      include: { ingredient: true },
    }),
    db.orderItem.findMany({
      where: { order: { status: "PAID", createdAt: { gte: since, lte: until } } },
      include: { menuItem: { include: { category: true } } },
    }),
    db.order.findMany({
      where: { status: "PAID", createdAt: { gte: since, lte: until } },
      select: { total: true, discount: true, tip: true, waiter: { select: { id: true, name: true } } },
    }),
  ]);

  const revenue = pays.reduce((s, p) => s + Number(p.amount), 0);
  const cost = outMoves.reduce((s, m) => s + Number(m.qty) * Number(m.ingredient.costPerUnit), 0);
  const profit = revenue - cost;
  const orders = pays.length;
  const cash = pays.filter((p) => p.method === "CASH").reduce((s, p) => s + Number(p.amount), 0);
  const card = revenue - cash;

  const dishMap = new Map<string, { name: Localized; qty: number; revenue: number }>();
  const catMap = new Map<string, { name: Localized; revenue: number }>();
  for (const it of items) {
    const rev = Number(it.unitPrice) * it.qty;
    const d = dishMap.get(it.menuItemId) ?? { name: it.menuItem.name as Localized, qty: 0, revenue: 0 };
    d.qty += it.qty;
    d.revenue += rev;
    dishMap.set(it.menuItemId, d);
    const c = catMap.get(it.menuItem.categoryId) ?? { name: it.menuItem.category.name as Localized, revenue: 0 };
    c.revenue += rev;
    catMap.set(it.menuItem.categoryId, c);
  }

  // Xodimlar samaradorligi (ofitsiantlar bo'yicha)
  const waiterMap = new Map<string, { name: string; orders: number; revenue: number }>();
  for (const o of paidOrders) {
    const net = Number(o.total) - Number(o.discount) + Number(o.tip);
    const w = waiterMap.get(o.waiter.id) ?? { name: o.waiter.name, orders: 0, revenue: 0 };
    w.orders += 1;
    w.revenue += net;
    waiterMap.set(o.waiter.id, w);
  }
  const byWaiter = Array.from(waiterMap.values())
    .map((w) => ({ ...w, avgCheck: w.orders ? w.revenue / w.orders : 0 }))
    .sort((a, b) => b.revenue - a.revenue);

  return {
    revenue,
    cost,
    profit,
    orders,
    cash,
    card,
    topDishes: Array.from(dishMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 8),
    byCategory: Array.from(catMap.values()).sort((a, b) => b.revenue - a.revenue),
    byWaiter,
  };
}
