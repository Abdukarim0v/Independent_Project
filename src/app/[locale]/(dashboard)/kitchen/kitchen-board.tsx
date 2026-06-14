"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Armchair, ShoppingBag, Clock, ChefHat, Check, Flame, Volume2, VolumeX, ListTree } from "lucide-react";
import { tx, cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/misc";
import { setItemStatus } from "./actions";

type RecipeRow = { name: Record<string, string>; qty: number; unit: string };
type Item = { id: string; name: Record<string, string>; qty: number; note: string | null; status: string; recipe: RecipeRow[] };
type Order = {
  id: string;
  number: number;
  type: string;
  status: string;
  tableNumber: number | null;
  createdAt: string;
  items: Item[];
};

const ITEM_BORDER: Record<string, string> = {
  PENDING: "border-l-muted-foreground",
  COOKING: "border-l-warning",
  READY: "border-l-success",
  SERVED: "border-l-info",
};

function beep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
    osc.onended = () => ctx.close();
  } catch {
    /* audio not available */
  }
}

export function KitchenBoard({ canAct = true }: { canAct?: boolean }) {
  const t = useTranslations("kitchen");
  const locale = useLocale();
  const [, startTransition] = useTransition();
  const [now, setNow] = useState(() => Date.now());
  const [muted, setMuted] = useState(false);
  const [showRecipe, setShowRecipe] = useState(false);
  const knownIds = useRef<Set<string>>(new Set());
  const firstLoad = useRef(true);

  const { data, isLoading, refetch } = useQuery<Order[]>({
    queryKey: ["kitchen"],
    queryFn: async () => {
      const res = await fetch("/api/kitchen");
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
    refetchInterval: 4000,
  });

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Yangi buyurtma kelganda ovozli signal
  useEffect(() => {
    if (!data) return;
    const ids = new Set(data.map((o) => o.id));
    if (firstLoad.current) {
      firstLoad.current = false;
      knownIds.current = ids;
      return;
    }
    const hasNew = data.some((o) => !knownIds.current.has(o.id));
    if (hasNew && !muted) beep();
    knownIds.current = ids;
  }, [data, muted]);

  function update(itemId: string, status: "COOKING" | "READY") {
    startTransition(async () => {
      await setItemStatus(itemId, status);
      refetch();
    });
  }

  const controls = (
    <div className="mb-4 flex items-center justify-end gap-2">
      <Button variant="outline" size="sm" onClick={() => setShowRecipe((v) => !v)}>
        <ListTree className="h-4 w-4" /> {t("recipe")}
      </Button>
      <Button variant={muted ? "outline" : "default"} size="sm" onClick={() => setMuted((v) => !v)}>
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        {muted ? t("mute") : t("sound")}
      </Button>
    </div>
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
        <ChefHat className="h-16 w-16 opacity-30" />
        <p className="text-lg">{t("noOrders")}</p>
      </div>
    );
  }

  return (
    <div>
      {controls}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {data.map((order) => {
        const mins = Math.floor((now - new Date(order.createdAt).getTime()) / 60000);
        const urgent = mins >= 15;
        return (
          <Card
            key={order.id}
            className={cn("flex flex-col overflow-hidden", order.status === "READY" && "ring-2 ring-success")}
          >
            <div className="flex items-center justify-between border-b bg-muted/40 p-3">
              <span className="flex items-center gap-1.5 font-bold">
                {order.tableNumber ? (
                  <>
                    <Armchair className="h-4 w-4 text-primary" /> {order.tableNumber}
                  </>
                ) : (
                  <ShoppingBag className="h-4 w-4 text-primary" />
                )}
                <span className="text-muted-foreground">#{order.number}</span>
              </span>
              <span className={cn("flex items-center gap-1 text-sm font-medium", urgent ? "text-destructive" : "text-muted-foreground")}>
                <Clock className="h-3.5 w-3.5" /> {mins} {t("min")}
              </span>
            </div>

            <div className="flex-1 space-y-2 p-3">
              {order.items.map((it) => (
                <div
                  key={it.id}
                  className={cn("rounded-md border-l-4 bg-background p-2", ITEM_BORDER[it.status])}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">
                      {tx(it.name, locale)} <span className="text-muted-foreground">×{it.qty}</span>
                    </span>
                    <Badge
                      variant={
                        it.status === "READY" ? "success" : it.status === "COOKING" ? "warning" : "secondary"
                      }
                    >
                      {t(it.status.toLowerCase() as "pending")}
                    </Badge>
                  </div>
                  {it.note && <p className="mt-1 text-xs text-muted-foreground">📝 {it.note}</p>}
                  {showRecipe && it.recipe.length > 0 && (
                    <ul className="mt-1 space-y-0.5 rounded bg-muted/50 p-1.5 text-xs text-muted-foreground">
                      {it.recipe.map((r, ri) => (
                        <li key={ri} className="flex justify-between">
                          <span>{tx(r.name, locale)}</span>
                          <span>{(r.qty * it.qty).toFixed(3).replace(/\.?0+$/, "")} {r.unit}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {canAct && (
                    <div className="mt-2 flex gap-2">
                      {it.status === "PENDING" && (
                        <Button size="sm" variant="outline" className="h-7 flex-1" onClick={() => update(it.id, "COOKING")}>
                          <Flame className="h-3.5 w-3.5" /> {t("markCooking")}
                        </Button>
                      )}
                      {it.status === "COOKING" && (
                        <Button size="sm" variant="success" className="h-7 flex-1" onClick={() => update(it.id, "READY")}>
                          <Check className="h-3.5 w-3.5" /> {t("markReady")}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        );
      })}
      </div>
    </div>
  );
}
