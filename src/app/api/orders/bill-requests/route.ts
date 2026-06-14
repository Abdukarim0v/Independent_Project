import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!["ADMIN", "MANAGER", "CASHIER"].includes(session.user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const orders = await db.order.findMany({
    where: { status: "BILL_REQUESTED" },
    include: { table: true, waiter: true },
    orderBy: { updatedAt: "asc" },
  });

  return NextResponse.json(
    orders.map((o) => ({
      id: o.id,
      number: o.number,
      type: o.type,
      tableNumber: o.table?.number ?? null,
      waiterName: o.waiter.name,
    })),
  );
}
