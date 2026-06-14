"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/guard";

const billingSchema = z.object({
  discountPercent: z.coerce.number().min(0).max(100),
  serviceFeePercent: z.coerce.number().min(0).max(100),
});

export async function updateBillingSettings(input: z.input<typeof billingSchema>) {
  await requireRole(["ADMIN"]);
  const d = billingSchema.parse(input);

  await db.settings.upsert({
    where: { id: "default" },
    update: d,
    create: { id: "default", ...d },
  });

  revalidatePath("/[locale]/settings", "page");
}

const workHoursSchema = z.object({
  workStartMinute: z.coerce.number().int().min(0).max(1439),
  workEndMinute: z.coerce.number().int().min(0).max(1439),
});

export async function updateWorkHours(input: z.input<typeof workHoursSchema>) {
  await requireRole(["ADMIN"]);
  const d = workHoursSchema.parse(input);

  await db.settings.upsert({
    where: { id: "default" },
    update: d,
    create: { id: "default", ...d },
  });

  revalidatePath("/[locale]/settings", "page");
}
