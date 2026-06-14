import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { requirePageAccess } from "@/lib/guard";
import { PageHeader } from "@/components/dashboard/page-header";
import { PosTerminal } from "./pos-terminal";

export const dynamic = "force-dynamic";

export default async function PosPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ table?: string }>;
}) {
  const { locale } = await params;
  const user = await requirePageAccess(locale, "pos");
  const { table: tableId } = await searchParams;
  const t = await getTranslations("pos");

  const [categories, items, table, activeOrder] = await Promise.all([
    db.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    db.menuItem.findMany({ where: { isAvailable: true }, orderBy: { createdAt: "asc" } }),
    tableId ? db.restaurantTable.findUnique({ where: { id: tableId } }) : null,
    tableId
      ? db.order.findFirst({
          where: { tableId, status: { in: ["OPEN", "SENT", "READY", "SERVED", "BILL_REQUESTED"] } },
          include: { items: { include: { menuItem: true }, orderBy: { createdAt: "asc" } } },
        })
      : null,
  ]);

  const cats = categories.map((c) => ({ id: c.id, name: c.name as Record<string, string> }));
  const dishes = items.map((m) => ({
    id: m.id,
    categoryId: m.categoryId,
    name: m.name as Record<string, string>,
    price: Number(m.price),
    imageUrl: m.imageUrl,
  }));

  const existing = activeOrder
    ? {
        id: activeOrder.id,
        number: activeOrder.number,
        status: activeOrder.status,
        total: Number(activeOrder.total),
        items: activeOrder.items.map((i) => ({
          id: i.id,
          name: i.menuItem.name as Record<string, string>,
          qty: i.qty,
          unitPrice: Number(i.unitPrice),
          status: i.status,
          note: i.note,
        })),
      }
    : null;

  return (
    <div className="animate-fade-in">
      <PageHeader title={t("title")} />
      <PosTerminal
        categories={cats}
        dishes={dishes}
        table={table ? { id: table.id, number: table.number } : null}
        existing={existing}
        role={user.role}
      />
    </div>
  );
}
