"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Armchair, ShoppingBag, Bell, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { markOrderServed } from "@/app/[locale]/(dashboard)/kitchen/actions";

type ReadyOrder = { id: string; number: number; type: string; tableNumber: number | null };

export function ReadyOrdersNotifier() {
  const t = useTranslations("kitchen");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [servingId, setServingId] = useState<string | null>(null);
  const knownIds = useRef<Set<string>>(new Set());
  const firstLoad = useRef(true);

  const { data, refetch } = useQuery<ReadyOrder[]>({
    queryKey: ["ready-orders"],
    queryFn: async () => {
      const res = await fetch("/api/orders/ready");
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
    refetchInterval: 4000,
  });

  function serve(orderId: string) {
    setServingId(orderId);
    startTransition(async () => {
      await markOrderServed(orderId);
      setServingId(null);
      router.refresh();
      refetch();
    });
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
        toast.success(t("readyToast", { number: order.number }), {
          icon: <Bell className="h-4 w-4" />,
          action: {
            label: t("markServed"),
            onClick: () => serve(order.id),
          },
        });
      }
    }
    knownIds.current = ids;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  if (!data || data.length === 0) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-success/40 bg-success/10 p-3">
      <Bell className="h-4 w-4 shrink-0 text-success" />
      <span className="text-sm font-medium">{t("readyOrders")}:</span>
      {data.map((order) => (
        <Button
          key={order.id}
          size="sm"
          variant="success"
          disabled={pending && servingId === order.id}
          onClick={() => serve(order.id)}
        >
          {pending && servingId === order.id ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : order.tableNumber ? (
            <Armchair className="h-3.5 w-3.5" />
          ) : (
            <ShoppingBag className="h-3.5 w-3.5" />
          )}
          #{order.number}
          {order.tableNumber ? ` · ${order.tableNumber}` : ""}
          {" — "}
          {t("markServed")}
        </Button>
      ))}
    </div>
  );
}
