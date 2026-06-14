import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { requirePageAccess } from "@/lib/guard";
import { PageHeader } from "@/components/dashboard/page-header";
import { MenuManager } from "./menu-manager";

export const dynamic = "force-dynamic";

export default async function MenuPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requirePageAccess(locale, "menu");
  const t = await getTranslations("menu");

  const [categories, items, ingredientRows] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    db.menuItem.findMany({ orderBy: { createdAt: "asc" }, include: { recipe: true } }),
    db.ingredient.findMany({ orderBy: { id: "asc" } }),
  ]);

  const cats = categories.map((c) => ({
    id: c.id,
    name: c.name as Record<string, string>,
    sortOrder: c.sortOrder,
  }));

  const dishes = items.map((m) => ({
    id: m.id,
    categoryId: m.categoryId,
    name: m.name as Record<string, string>,
    description: (m.description as Record<string, string>) ?? null,
    price: Number(m.price),
    prepTimeMin: m.prepTimeMin,
    imageUrl: m.imageUrl,
    isAvailable: m.isAvailable,
    recipe: m.recipe.map((r) => ({ ingredientId: r.ingredientId, qty: Number(r.qty) })),
  }));

  const ingredients = ingredientRows.map((i) => ({
    id: i.id,
    name: i.name as Record<string, string>,
    unit: i.unit,
  }));

  return (
    <div className="animate-fade-in">
      <PageHeader title={t("title")} />
      <MenuManager categories={cats} dishes={dishes} ingredients={ingredients} />
    </div>
  );
}
