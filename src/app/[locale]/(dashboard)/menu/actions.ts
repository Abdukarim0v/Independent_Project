"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/guard";

const MANAGERS = ["ADMIN", "MANAGER"] as const;

const localized = z.object({
  uz: z.string().min(1),
  ru: z.string().min(1),
  en: z.string().min(1),
});

const categorySchema = z.object({
  id: z.string().optional(),
  name: localized,
  sortOrder: z.coerce.number().int().default(0),
});

const looseLocalized = z.object({
  uz: z.string().min(1),
  ru: z.string().optional().default(""),
  en: z.string().optional().default(""),
});

const dishSchema = z.object({
  id: z.string().optional(),
  categoryId: z.string().min(1),
  name: looseLocalized,
  description: z
    .object({ uz: z.string(), ru: z.string(), en: z.string() })
    .optional(),
  price: z.coerce.number().nonnegative(),
  prepTimeMin: z.coerce.number().int().nonnegative().default(10),
  imageUrl: z.string().optional().or(z.literal("")),
  isAvailable: z.coerce.boolean().default(true),
  recipe: z
    .array(z.object({ ingredientId: z.string().min(1), qty: z.coerce.number().positive() }))
    .optional(),
});

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export async function uploadDishImage(formData: FormData) {
  await requireRole([...MANAGERS]);
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("INVALID_FILE");

  const ext = ALLOWED_IMAGE_TYPES[file.type];
  if (!ext) throw new Error("INVALID_TYPE");
  if (file.size > MAX_IMAGE_SIZE) throw new Error("TOO_LARGE");

  const dir = path.join(process.cwd(), "public", "uploads", "menu");
  await mkdir(dir, { recursive: true });
  const filename = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);

  return `/uploads/menu/${filename}`;
}

export async function saveCategory(input: z.input<typeof categorySchema>) {
  await requireRole([...MANAGERS]);
  const data = categorySchema.parse(input);
  if (data.id) {
    await db.category.update({
      where: { id: data.id },
      data: { name: data.name, sortOrder: data.sortOrder },
    });
  } else {
    await db.category.create({ data: { name: data.name, sortOrder: data.sortOrder } });
  }
  revalidatePath("/[locale]/menu", "page");
}

export async function deleteCategory(id: string) {
  await requireRole([...MANAGERS]);
  await db.category.delete({ where: { id } });
  revalidatePath("/[locale]/menu", "page");
}

export async function saveDish(input: z.input<typeof dishSchema>) {
  await requireRole([...MANAGERS]);
  const d = dishSchema.parse(input);
  const name = { uz: d.name.uz, ru: d.name.ru || d.name.uz, en: d.name.en || d.name.uz };
  const payload = {
    categoryId: d.categoryId,
    name,
    description: d.description,
    price: d.price,
    prepTimeMin: d.prepTimeMin,
    imageUrl: d.imageUrl || null,
    isAvailable: d.isAvailable,
  };

  // Faqat bitta ingredientga ikki marta yozilmasligi uchun birlashtiramiz
  const recipe = d.recipe
    ? Array.from(
        d.recipe.reduce((m, r) => m.set(r.ingredientId, (m.get(r.ingredientId) ?? 0) + r.qty), new Map<string, number>()),
        ([ingredientId, qty]) => ({ ingredientId, qty }),
      )
    : undefined;

  await db.$transaction(async (tx) => {
    let menuItemId = d.id;
    if (d.id) {
      await tx.menuItem.update({ where: { id: d.id }, data: payload });
    } else {
      const created = await tx.menuItem.create({ data: payload });
      menuItemId = created.id;
    }
    if (recipe && menuItemId) {
      await tx.recipeItem.deleteMany({ where: { menuItemId } });
      if (recipe.length > 0) {
        await tx.recipeItem.createMany({
          data: recipe.map((r) => ({ menuItemId, ingredientId: r.ingredientId, qty: r.qty })),
        });
      }
    }
  });

  revalidatePath("/[locale]/menu", "page");
}

export async function deleteDish(id: string) {
  await requireRole([...MANAGERS]);
  const usageCount = await db.orderItem.count({ where: { menuItemId: id } });
  if (usageCount > 0) {
    await db.menuItem.update({ where: { id }, data: { isAvailable: false } });
    revalidatePath("/[locale]/menu", "page");
    throw new Error("HAS_ORDERS");
  }
  await db.menuItem.delete({ where: { id } });
  revalidatePath("/[locale]/menu", "page");
}

export async function toggleDishAvailability(id: string, isAvailable: boolean) {
  await requireRole([...MANAGERS]);
  await db.menuItem.update({ where: { id }, data: { isAvailable } });
  revalidatePath("/[locale]/menu", "page");
}
