import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const orders = await db.order.findMany({
    where: { status: { in: ["SENT", "READY"] } },
    orderBy: { createdAt: "asc" },
    include: {
      table: true,
      items: {
        include: { menuItem: { include: { recipe: { include: { ingredient: true } } } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return NextResponse.json(
    orders.map((o) => ({
      id: o.id,
      number: o.number,
      type: o.type,
      status: o.status,
      tableNumber: o.table?.number ?? null,
      createdAt: o.createdAt.toISOString(),
      items: o.items.map((i) => ({
        id: i.id,
        name: i.menuItem.name as Record<string, string>,
        qty: i.qty,
        note: i.note,
        status: i.status,
        recipe: i.menuItem.recipe.map((r) => ({
          name: r.ingredient.name as Record<string, string>,
          qty: Number(r.qty),
          unit: r.ingredient.unit,
        })),
      })),
    })),
  );
}
