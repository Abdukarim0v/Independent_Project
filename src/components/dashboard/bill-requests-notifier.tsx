"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Armchair, ShoppingBag, Receipt } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type BillRequest = { id: string; number: number; type: string; tableNumber: number | null; waiterName: string };

export function BillRequestsNotifier() {
  const t = useTranslations("pos");
  const ttbl = useTranslations("tables");
  const router = useRouter();
  const knownIds = useRef<Set<string>>(new Set());
  const firstLoad = useRef(true);

  const { data } = useQuery<BillRequest[]>({
    queryKey: ["bill-requests"],
    queryFn: async () => {
      const res = await fetch("/api/orders/bill-requests");
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
    refetchInterval: 4000,
  });

  function open(orderId: string) {
    router.push(`/payment?order=${orderId}`);
  }

  useEffect(() => {
    if (!data) return;
    const ids = new Set(data.map((o) => o.id));
    if (firstLoad.current) {
      firstLoad.current = false;
      knownIds.current = ids;
      return;
    }
    for (const order of data) {
      if (!knownIds.current.has(order.id)) {
        toast.info(
          order.tableNumber
            ? t("billRequestToast", { table: order.tableNumber, waiter: order.waiterName })
            : t("billRequestToastTakeaway", { number: order.number, waiter: order.waiterName }),
          {
            icon: <Receipt className="h-4 w-4" />,
            action: {
              label: t("openBill"),
              onClick: () => open(order.id),
            },
          },
        );
      }
    }
    knownIds.current = ids;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  if (!data || data.length === 0) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3">
      <Receipt className="h-4 w-4 shrink-0 text-warning" />
      <span className="text-sm font-medium">{t("billRequests")}:</span>
      {data.map((order) => (
        <Button key={order.id} size="sm" variant="outline" onClick={() => open(order.id)}>
          {order.tableNumber ? <Armchair className="h-3.5 w-3.5" /> : <ShoppingBag className="h-3.5 w-3.5" />}
          {order.tableNumber ? `${ttbl("table")} ${order.tableNumber}` : `#${order.number}`}
          {" — "}
          {order.waiterName}
        </Button>
      ))}
    </div>
  );
}
