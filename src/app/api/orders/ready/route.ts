import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const orders = await db.order.findMany({
    where:
      session.user.role === "WAITER"
        ? { status: "READY", waiterId: session.user.id }
        : { status: "READY" },
    include: { table: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(
    orders.map((o) => ({
      id: o.id,
      number: o.number,
      type: o.type,
      tableNumber: o.table?.number ?? null,
    })),
  );
}
