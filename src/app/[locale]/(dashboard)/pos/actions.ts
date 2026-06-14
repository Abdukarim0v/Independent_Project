"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/guard";
import { Prisma } from "@prisma/client";

const submitSchema = z.object({
  tableId: z.string().optional().nullable(),
  type: z.enum(["DINE_IN", "TAKEAWAY"]),
  note: z.string().optional(),
  items: z
    .array(
      z.object({
        menuItemId: z.string(),
        qty: z.number().int().positive(),
        note: z.string().optional(),
      }),
    )
    .min(1),
});

function revalidateAll() {
  revalidatePath("/[locale]/tables", "page");
  revalidatePath("/[locale]/pos", "page");
  revalidatePath("/[locale]/kitchen", "page");
}

/** Create or append items to an active order, send to kitchen, deduct stock. */
export async function submitOrder(input: z.input<typeof submitSchema>) {
  const user = await requireRole(["WAITER"]);
  const data = submitSchema.parse(input);

  const menuItems = await db.menuItem.findMany({
    where: { id: { in: data.items.map((i) => i.menuItemId) } },
    include: { recipe: true },
  });
  const byId = new Map(menuItems.map((m) => [m.id, m]));

  const orderId = await db.$transaction(async (tx) => {
    // find an active (unpaid) order for the table
    let order =
      data.type === "DINE_IN" && data.tableId
        ? await tx.order.findFirst({
            where: { tableId: data.tableId, status: { in: ["OPEN", "SENT", "READY", "SERVED", "BILL_REQUESTED"] } },
          })
        : null;

    if (!order) {
      order = await tx.order.create({
        data: {
          type: data.type,
          tableId: data.type === "DINE_IN" ? data.tableId ?? null : null,
          waiterId: user.id,
          status: "SENT",
          note: data.note,
        },
      });
    }

    // add items + deduct stock
    for (const it of data.items) {
      const mi = byId.get(it.menuItemId);
      if (!mi) continue;
      await tx.orderItem.create({
        data: {
          orderId: order.id,
          menuItemId: mi.id,
          qty: it.qty,
          unitPrice: mi.price,
          note: it.note,
          status: "PENDING",
        },
      });
      for (const r of mi.recipe) {
        const used = r.qty.mul(it.qty);
        await tx.ingredient.update({
          where: { id: r.ingredientId },
          data: { stockQty: { decrement: used } },
        });
        await tx.stockMovement.create({
          data: { ingredientId: r.ingredientId, type: "OUT", qty: used, reason: `Order #${order.number}` },
        });
      }
    }

    // recompute total
    const items = await tx.orderItem.findMany({ where: { orderId: order.id } });
    const total = items.reduce(
      (s, i) => s.add(i.unitPrice.mul(i.qty)),
      new Prisma.Decimal(0),
    );

    await tx.order.update({ where: { id: order.id }, data: { total, status: "SENT" } });

    if (order.tableId) {
      await tx.restaurantTable.update({ where: { id: order.tableId }, data: { status: "OCCUPIED" } });
    }
    return order.id;
  });

  revalidateAll();
  return { orderId };
}

export async function cancelOrder(orderId: string) {
  await requireRole(["WAITER"]);
  const order = await db.order.update({
    where: { id: orderId },
    data: { status: "CANCELLED" },
  });
  if (order.tableId) {
    await db.restaurantTable.update({ where: { id: order.tableId }, data: { status: "FREE" } });
  }
  revalidateAll();
}

export async function requestBill(orderId: string) {
  await requireRole(["WAITER"]);
  const existing = await db.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!existing) throw new Error("NOT_FOUND");
  if (existing.items.length === 0) throw new Error("NO_ITEMS");
  if (existing.status !== "SERVED") throw new Error("NOT_SERVED");

  const order = await db.order.update({ where: { id: orderId }, data: { status: "BILL_REQUESTED" } });
  if (order.tableId) {
    await db.restaurantTable.update({ where: { id: order.tableId }, data: { status: "BILL" } });
  }
  revalidateAll();
}

export async function removeOrderItem(itemId: string) {
  await requireRole(["WAITER"]);
  const item = await db.orderItem.findUnique({ where: { id: itemId } });
  if (!item) return;
  await db.$transaction(async (tx) => {
    await tx.orderItem.delete({ where: { id: itemId } });
    const items = await tx.orderItem.findMany({ where: { orderId: item.orderId } });
    const total = items.reduce((s, i) => s.add(i.unitPrice.mul(i.qty)), new Prisma.Decimal(0));
    await tx.order.update({ where: { id: item.orderId }, data: { total } });
  });
  revalidateAll();
}
