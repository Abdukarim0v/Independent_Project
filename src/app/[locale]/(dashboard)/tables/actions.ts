"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/guard";

const MANAGERS = ["ADMIN", "MANAGER"] as const;

const tableSchema = z.object({
  id: z.string().optional(),
  number: z.coerce.number().int().positive(),
  capacity: z.coerce.number().int().positive(),
  zone: z.string().min(1),
});

export async function saveTable(input: z.input<typeof tableSchema>) {
  await requireRole([...MANAGERS]);
  const d = tableSchema.parse(input);

  if (d.id) {
    await db.restaurantTable.update({
      where: { id: d.id },
      data: { number: d.number, capacity: d.capacity, zone: d.zone },
    });
  } else {
    await db.restaurantTable.create({
      data: { number: d.number, capacity: d.capacity, zone: d.zone },
    });
  }
  revalidatePath("/[locale]/tables", "page");
}

export async function deleteTable(id: string) {
  await requireRole([...MANAGERS]);
  const activeOrder = await db.order.findFirst({
    where: { tableId: id, status: { in: ["OPEN", "SENT", "READY", "SERVED", "BILL_REQUESTED"] } },
  });
  if (activeOrder) throw new Error("TABLE_HAS_ACTIVE_ORDER");

  await db.restaurantTable.delete({ where: { id } });
  revalidatePath("/[locale]/tables", "page");
}

/** Stol statusini qo'lda o'rnatish (faol buyurtma yo'q bo'lsa). */
export async function setTableStatus(id: string, status: "FREE" | "OCCUPIED" | "RESERVED" | "BILL") {
  await requireRole([...MANAGERS]);
  const activeOrder = await db.order.findFirst({
    where: { tableId: id, status: { in: ["OPEN", "SENT", "READY", "SERVED", "BILL_REQUESTED"] } },
  });
  if (activeOrder) throw new Error("TABLE_HAS_ACTIVE_ORDER");

  await db.$transaction(async (tx) => {
    if (status !== "RESERVED") {
      await tx.reservation.deleteMany({ where: { tableId: id } });
    }
    await tx.restaurantTable.update({ where: { id }, data: { status } });
  });
  revalidatePath("/[locale]/tables", "page");
}

const reservationSchema = z.object({
  tableId: z.string().min(1),
  guestName: z.string().min(1),
  phone: z.string().optional(),
  partySize: z.coerce.number().int().positive(),
  time: z.coerce.date(),
  note: z.string().optional(),
});

export async function createReservation(input: z.input<typeof reservationSchema>) {
  await requireRole([...MANAGERS]);
  const d = reservationSchema.parse(input);

  const activeOrder = await db.order.findFirst({
    where: { tableId: d.tableId, status: { in: ["OPEN", "SENT", "READY", "SERVED", "BILL_REQUESTED"] } },
  });
  if (activeOrder) throw new Error("TABLE_HAS_ACTIVE_ORDER");

  await db.$transaction([
    db.reservation.create({
      data: {
        tableId: d.tableId,
        guestName: d.guestName,
        phone: d.phone || null,
        partySize: d.partySize,
        time: d.time,
        note: d.note || null,
      },
    }),
    db.restaurantTable.update({ where: { id: d.tableId }, data: { status: "RESERVED" } }),
  ]);
  revalidatePath("/[locale]/tables", "page");
}

export async function cancelReservation(tableId: string) {
  await requireRole([...MANAGERS]);
  await db.$transaction([
    db.reservation.deleteMany({ where: { tableId } }),
    db.restaurantTable.update({ where: { id: tableId }, data: { status: "FREE" } }),
  ]);
  revalidatePath("/[locale]/tables", "page");
}
