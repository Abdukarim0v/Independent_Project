"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/guard";
import { getSettings } from "@/lib/settings";

const paySchema = z.object({
  orderId: z.string(),
  payments: z
    .array(
      z.object({
        method: z.enum(["CASH", "CARD"]),
        amount: z.coerce.number().positive(),
      }),
    )
    .min(1),
});

export async function payOrder(input: z.input<typeof paySchema>) {
  const user = await requireRole(["CASHIER"]);
  const data = paySchema.parse(input);

  const order = await db.order.findUnique({ where: { id: data.orderId } });
  if (!order) throw new Error("NOT_FOUND");
  if (order.status === "PAID") return { ok: true };
  if (order.status !== "BILL_REQUESTED") throw new Error("BILL_NOT_REQUESTED");

  const settings = await getSettings();

  const discountAmount = (Number(order.total) * settings.discountPercent) / 100;
  const serviceFeeAmount = (Number(order.total) * settings.serviceFeePercent) / 100;
  const grandTotal = Math.max(0, Number(order.total) - discountAmount + serviceFeeAmount);

  const paid = data.payments.reduce((s, p) => s + p.amount, 0);
  // To'lovlar yig'indisi yakuniy summaga teng bo'lishi shart (0.5 so'm epsilon)
  if (Math.abs(paid - grandTotal) > 0.5) throw new Error("AMOUNT_MISMATCH");

  await db.$transaction(async (tx) => {
    await tx.payment.createMany({
      data: data.payments.map((p) => ({
        orderId: order.id,
        method: p.method,
        amount: p.amount,
        cashierId: user.id,
      })),
    });
    await tx.orderItem.updateMany({ where: { orderId: order.id }, data: { status: "SERVED" } });
    await tx.order.update({
      where: { id: order.id },
      data: { status: "PAID", discount: discountAmount, tip: serviceFeeAmount },
    });
    if (order.tableId) {
      await tx.restaurantTable.update({ where: { id: order.tableId }, data: { status: "FREE" } });
    }
  });

  revalidatePath("/[locale]/payment", "page");
  revalidatePath("/[locale]/tables", "page");
  revalidatePath("/[locale]/reports", "page");
  return { ok: true };
}
