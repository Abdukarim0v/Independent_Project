"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/guard";
import type { OrderItemStatus } from "@prisma/client";

export async function setItemStatus(itemId: string, status: OrderItemStatus) {
  await requireRole(["COOK"]);

  const item = await db.orderItem.update({
    where: { id: itemId },
    data: { status },
    select: { orderId: true },
  });

  // If every item in the order is READY/SERVED, mark the order READY.
  const items = await db.orderItem.findMany({ where: { orderId: item.orderId } });
  const allReady = items.every((i) => i.status === "READY" || i.status === "SERVED");
  if (allReady) {
    await db.order.update({ where: { id: item.orderId }, data: { status: "READY" } });
  } else {
    await db.order.update({ where: { id: item.orderId }, data: { status: "SENT" } });
  }

  revalidatePath("/[locale]/kitchen", "page");
  revalidatePath("/[locale]/tables", "page");
}

export async function markOrderServed(orderId: string) {
  await requireRole(["WAITER"]);

  await db.$transaction([
    db.orderItem.updateMany({ where: { orderId }, data: { status: "SERVED" } }),
    db.order.update({ where: { id: orderId }, data: { status: "SERVED" } }),
  ]);

  revalidatePath("/[locale]/kitchen", "page");
  revalidatePath("/[locale]/tables", "page");
  revalidatePath("/[locale]/pos", "page");
}
