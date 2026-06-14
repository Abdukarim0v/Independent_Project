import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { requirePageAccess } from "@/lib/guard";
import { PageHeader } from "@/components/dashboard/page-header";
import { TablesManager } from "./tables-manager";

export const dynamic = "force-dynamic";

export default async function TablesPage() {
  const t = await getTranslations("tables");
  const locale = await getLocale();
  const user = await requirePageAccess(locale, "tables");

  const tables = await db.restaurantTable.findMany({
    orderBy: { number: "asc" },
    include: {
      orders: {
        where: { status: { in: ["OPEN", "SENT", "READY", "SERVED", "BILL_REQUESTED"] } },
        include: { _count: { select: { items: true } } },
        take: 1,
      },
      reservations: { orderBy: { time: "asc" }, take: 1 },
    },
  });

  const zones = Array.from(new Set(tables.map((tb) => tb.zone)));
  const zoneNames: Record<string, string> = {
    main: t("zones.main"),
    terrace: t("zones.terrace"),
    vip: t("zones.vip"),
  };

  const data = tables.map((tb) => {
    const order = tb.orders[0];
    const res = tb.reservations[0];
    return {
      id: tb.id,
      number: tb.number,
      capacity: tb.capacity,
      zone: tb.zone,
      status: tb.status,
      order: order ? { number: order.number, total: Number(order.total), status: order.status } : null,
      reservation: res
        ? {
            guestName: res.guestName,
            phone: res.phone,
            partySize: res.partySize,
            time: res.time.toISOString(),
            note: res.note,
          }
        : null,
    };
  });

  return (
    <div className="animate-fade-in">
      <PageHeader title={t("title")} />
      <TablesManager
        tables={data}
        zones={zones}
        zoneNames={zoneNames}
        locale={locale}
        canManage={user.role === "ADMIN" || user.role === "MANAGER"}
      />
    </div>
  );
}
