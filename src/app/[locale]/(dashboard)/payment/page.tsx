import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";
import { requireSession } from "@/lib/guard";
import { homeFor } from "@/lib/rbac";
import { getSettings } from "@/lib/settings";
import { PageHeader } from "@/components/dashboard/page-header";
import { PaymentPanel } from "./payment-panel";

export const dynamic = "force-dynamic";

export default async function PaymentPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ order?: string }>;
}) {
  const { locale } = await params;
  const user = await requireSession();
  if (!["ADMIN", "MANAGER", "CASHIER"].includes(user.role)) {
    const home = homeFor(user.role);
    redirect(`/${locale}/${home === "dashboard" ? "" : home}`);
  }
  const { order: orderId } = await searchParams;
  const t = await getTranslations("payment");
  if (!orderId) notFound();

  const settings = await getSettings();

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      table: true,
      payments: true,
      items: { include: { menuItem: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!order) notFound();

  const data = {
    id: order.id,
    number: order.number,
    type: order.type,
    status: order.status,
    total: Number(order.total),
    discount: Number(order.discount),
    tip: Number(order.tip),
    tableNumber: order.table?.number ?? null,
    paidAt: order.payments[0]?.paidAt.toISOString() ?? null,
    payments: order.payments.map((p) => ({ method: p.method, amount: Number(p.amount) })),
    createdAtLabel: formatDateTime(order.createdAt),
    items: order.items.map((i) => ({
      id: i.id,
      name: i.menuItem.name as Record<string, string>,
      qty: i.qty,
      unitPrice: Number(i.unitPrice),
    })),
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title={t("title")} />
      <PaymentPanel order={data} settings={settings} role={user.role} />
    </div>
  );
}
