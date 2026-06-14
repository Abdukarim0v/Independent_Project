"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/guard";

const staffSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  username: z.string().min(3),
  role: z.enum(["ADMIN", "MANAGER", "WAITER", "COOK", "CASHIER"]),
  isActive: z.coerce.boolean().default(true),
  password: z.string().optional(),
  workStartMinute: z.coerce.number().int().min(0).max(1439).nullable().optional(),
  workEndMinute: z.coerce.number().int().min(0).max(1439).nullable().optional(),
});

export async function saveStaff(input: z.input<typeof staffSchema>) {
  await requireRole(["ADMIN"]);
  const d = staffSchema.parse(input);

  if (d.id) {
    await db.user.update({
      where: { id: d.id },
      data: {
        name: d.name,
        username: d.username,
        role: d.role,
        isActive: d.isActive,
        workStartMinute: d.workStartMinute ?? null,
        workEndMinute: d.workEndMinute ?? null,
        ...(d.password ? { passwordHash: bcrypt.hashSync(d.password, 10) } : {}),
      },
    });
  } else {
    await db.user.create({
      data: {
        name: d.name,
        username: d.username,
        role: d.role,
        isActive: d.isActive,
        workStartMinute: d.workStartMinute ?? null,
        workEndMinute: d.workEndMinute ?? null,
        passwordHash: bcrypt.hashSync(d.password || "12345678", 10),
      },
    });
  }
  revalidatePath("/[locale]/staff", "page");
}

export async function toggleStaffActive(id: string, isActive: boolean) {
  await requireRole(["ADMIN"]);
  await db.user.update({ where: { id }, data: { isActive } });
  revalidatePath("/[locale]/staff", "page");
}

export async function deleteStaff(id: string) {
  await requireRole(["ADMIN"]);
  await db.user.delete({ where: { id } });
  revalidatePath("/[locale]/staff", "page");
}
