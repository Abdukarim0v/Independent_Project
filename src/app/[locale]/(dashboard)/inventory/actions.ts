"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/guard";

const MANAGERS = ["ADMIN", "MANAGER"] as const;

const ingredientSchema = z.object({
  id: z.string().optional(),
  name: z.object({ uz: z.string().min(1), ru: z.string().optional().default(""), en: z.string().optional().default("") }),
  unit: z.string().min(1),
  minQty: z.coerce.number().nonnegative(),
  costPerUnit: z.coerce.number().nonnegative(),
  stockQty: z.coerce.number().nonnegative().optional(),
});

export async function saveIngredient(input: z.input<typeof ingredientSchema>) {
  await requireRole([...MANAGERS]);
  const d = ingredientSchema.parse(input);
  const name = { uz: d.name.uz, ru: d.name.ru || d.name.uz, en: d.name.en || d.name.uz };

  if (d.id) {
    await db.ingredient.update({
      where: { id: d.id },
      data: { name, unit: d.unit, minQty: d.minQty, costPerUnit: d.costPerUnit },
    });
  } else {
    await db.ingredient.create({
      data: { name, unit: d.unit, minQty: d.minQty, costPerUnit: d.costPerUnit, stockQty: d.stockQty ?? 0 },
    });
  }
  revalidatePath("/[locale]/inventory", "page");
}

export async function addStock(id: string, qty: number) {
  await requireRole([...MANAGERS]);
  if (qty <= 0) return;
  await db.$transaction([
    db.ingredient.update({ where: { id }, data: { stockQty: { increment: qty } } }),
    db.stockMovement.create({ data: { ingredientId: id, type: "IN", qty, reason: "Qo'lda kirim" } }),
  ]);
  revalidatePath("/[locale]/inventory", "page");
}

export async function deleteIngredient(id: string) {
  await requireRole([...MANAGERS]);
  await db.ingredient.delete({ where: { id } });
  revalidatePath("/[locale]/inventory", "page");
}

/** Oxirgi 30 ta ombor harakatini qaytaradi (tarix dialogi uchun). */
export async function getMovements(ingredientId: string) {
  await requireRole([...MANAGERS]);
  const rows = await db.stockMovement.findMany({
    where: { ingredientId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return rows.map((m) => ({
    id: m.id,
    type: m.type,
    qty: Number(m.qty),
    reason: m.reason,
    createdAt: m.createdAt.toISOString(),
  }));
}

/** Inventarizatsiya: haqiqiy sanab chiqilgan miqdorga to'g'rilab, ADJUST yozadi. */
export async function adjustStock(id: string, countedQty: number, reason: string) {
  await requireRole([...MANAGERS]);
  if (countedQty < 0) throw new Error("INVALID_QTY");
  const ing = await db.ingredient.findUnique({ where: { id } });
  if (!ing) throw new Error("NOT_FOUND");

  const delta = countedQty - Number(ing.stockQty);
  if (delta === 0) return;

  await db.$transaction([
    db.ingredient.update({ where: { id }, data: { stockQty: countedQty } }),
    db.stockMovement.create({
      data: { ingredientId: id, type: "ADJUST", qty: delta, reason: reason || "Korrektirovka" },
    }),
  ]);
  revalidatePath("/[locale]/inventory", "page");
}
