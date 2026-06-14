import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { requirePageAccess } from "@/lib/guard";
import { PageHeader } from "@/components/dashboard/page-header";
import { InventoryManager } from "./inventory-manager";

export const dynamic = "force-dynamic";

export default async function InventoryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requirePageAccess(locale, "inventory");
  const t = await getTranslations("inventory");
  const ingredients = await db.ingredient.findMany({ orderBy: { name: "asc" } });

  const data = ingredients.map((i) => ({
    id: i.id,
    name: i.name as Record<string, string>,
    unit: i.unit,
    stockQty: Number(i.stockQty),
    minQty: Number(i.minQty),
    costPerUnit: Number(i.costPerUnit),
  }));

  return (
    <div className="animate-fade-in">
      <PageHeader title={t("title")} />
      <InventoryManager ingredients={data} />
    </div>
  );
}
