"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Minus, Plus, Trash2, Send, Armchair, ShoppingBag, Loader2, X, Receipt, Eye } from "lucide-react";
import { toast } from "sonner";
import { tx, formatMoney, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { Role } from "@prisma/client";
import { submitOrder, removeOrderItem, requestBill } from "./actions";

type Cat = { id: string; name: Record<string, string> };
type Dish = { id: string; categoryId: string; name: Record<string, string>; price: number; imageUrl: string | null };
type ExistingItem = {
  id: string;
  name: Record<string, string>;
  qty: number;
  unitPrice: number;
  status: string;
  note: string | null;
};
type Existing = { id: string; number: number; status: string; total: number; items: ExistingItem[] } | null;

type CartLine = { dish: Dish; qty: number };

const ITEM_STATUS_VARIANT: Record<string, "secondary" | "warning" | "success" | "info"> = {
  PENDING: "secondary",
  COOKING: "warning",
  READY: "success",
  SERVED: "info",
};

export function PosTerminal({
  categories,
  dishes,
  table,
  existing,
  role,
}: {
  categories: Cat[];
  dishes: Dish[];
  table: { id: string; number: number } | null;
  existing: Existing;
  role: Role;
}) {
  const t = useTranslations("pos");
  const tc = useTranslations("common");
  const tk = useTranslations("kitchen");
  const tos = useTranslations("orderStatus");
  const ttbl = useTranslations("tables");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [activeCat, setActiveCat] = useState(categories[0]?.id ?? "");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [note, setNote] = useState("");
  const [type, setType] = useState<"DINE_IN" | "TAKEAWAY">(table ? "DINE_IN" : "TAKEAWAY");

  const visible = useMemo(() => dishes.filter((d) => d.categoryId === activeCat), [dishes, activeCat]);
  const cartTotal = cart.reduce((s, l) => s + l.dish.price * l.qty, 0);

  function add(dish: Dish) {
    setCart((c) => {
      const found = c.find((l) => l.dish.id === dish.id);
      if (found) return c.map((l) => (l === found ? { ...l, qty: l.qty + 1 } : l));
      return [...c, { dish, qty: 1 }];
    });
  }
  function setQty(dish: Dish, delta: number) {
    setCart((c) =>
      c.flatMap((l) => {
        if (l.dish.id !== dish.id) return [l];
        const q = l.qty + delta;
        return q <= 0 ? [] : [{ ...l, qty: q }];
      }),
    );
  }

  function send() {
    if (cart.length === 0) return;
    startTransition(async () => {
      try {
        await submitOrder({
          tableId: table?.id ?? null,
          type,
          note: note || undefined,
          items: cart.map((l) => ({ menuItemId: l.dish.id, qty: l.qty })),
        });
        toast.success(t("sent"));
        setCart([]);
        setNote("");
        router.refresh();
      } catch {
        toast.error(tc("error"));
      }
    });
  }

  function dropExisting(itemId: string) {
    startTransition(async () => {
      try {
        await removeOrderItem(itemId);
        router.refresh();
      } catch {
        toast.error(tc("error"));
      }
    });
  }

  function askBill() {
    if (!existing) return;
    startTransition(async () => {
      try {
        await requestBill(existing.id);
        toast.success(t("billRequested"));
        router.refresh();
      } catch (e) {
        if (e instanceof Error && e.message === "NO_ITEMS") toast.error(t("noItemsForBill"));
        else if (e instanceof Error && e.message === "NOT_SERVED") toast.error(t("notServedForBill"));
        else toast.error(tc("error"));
      }
    });
  }

  const viewOnly = role !== "WAITER";

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      {/* menu side */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCat(c.id)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                activeCat === c.id ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent",
              )}
            >
              {tx(c.name, locale)}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {visible.map((d) => (
            <button
              key={d.id}
              onClick={() => !viewOnly && add(d)}
              disabled={viewOnly}
              className="flex flex-col rounded-xl border bg-card p-3 text-left transition-all hover:border-primary hover:shadow-md active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="line-clamp-2 min-h-[2.5rem] font-medium">{tx(d.name, locale)}</span>
              <span className="mt-1 font-bold text-primary">{formatMoney(d.price)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* order side */}
      <Card className="flex h-[calc(100vh-12rem)] flex-col">
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-2 font-semibold">
            {table ? <Armchair className="h-5 w-5 text-primary" /> : <ShoppingBag className="h-5 w-5 text-primary" />}
            {table ? `${ttbl("table")} ${table.number}` : t("takeaway")}
          </div>
          {existing && <Badge variant="info">#{existing.number}</Badge>}
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {/* already-sent items */}
          {existing && existing.items.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {tos(existing.status)}
              </p>
              {existing.items.map((it) => (
                <div key={it.id} className="flex items-center gap-2 rounded-lg bg-muted/50 p-2 text-sm">
                  <Badge variant={ITEM_STATUS_VARIANT[it.status] ?? "secondary"} className="shrink-0">
                    {tk(it.status.toLowerCase() as "pending")}
                  </Badge>
                  <span className="flex-1 truncate">{tx(it.name, locale)}</span>
                  <span className="text-muted-foreground">×{it.qty}</span>
                  <span className="w-20 text-right font-medium">{formatMoney(it.unitPrice * it.qty)}</span>
                  {it.status === "PENDING" && (
                    <button onClick={() => dropExisting(it.id)} className="text-destructive">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* new cart */}
          {cart.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">{t("cart")}</p>
              {cart.map((l) => (
                <div key={l.dish.id} className="flex items-center gap-2 rounded-lg border p-2 text-sm">
                  <span className="flex-1 truncate">{tx(l.dish.name, locale)}</span>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setQty(l.dish, -1)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 text-center font-medium">{l.qty}</span>
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setQty(l.dish, 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <span className="w-20 text-right font-medium">{formatMoney(l.dish.price * l.qty)}</span>
                  <button onClick={() => setQty(l.dish, -l.qty)} className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {!existing && cart.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
              <ShoppingBag className="h-10 w-10 opacity-40" />
              <p className="text-sm">{t("cartHint")}</p>
            </div>
          )}
        </div>

        {/* footer */}
        <div className="space-y-3 border-t p-4">
          {!table && (
            <div className="flex gap-2">
              {(["DINE_IN", "TAKEAWAY"] as const).map((tp) => (
                <button
                  key={tp}
                  onClick={() => setType(tp)}
                  className={cn(
                    "flex-1 rounded-md border py-1.5 text-sm font-medium",
                    type === tp ? "border-primary bg-primary/10 text-primary" : "",
                  )}
                >
                  {t(tp === "DINE_IN" ? "dineIn" : "takeaway")}
                </button>
              ))}
            </div>
          )}

          {!viewOnly && cart.length > 0 && (
            <Input placeholder={t("addNote")} value={note} onChange={(e) => setNote(e.target.value)} />
          )}

          <div className="flex items-center justify-between text-lg font-bold">
            <span>{tc("total")}</span>
            <span className="text-primary">{formatMoney((existing?.total ?? 0) + cartTotal)}</span>
          </div>

          {viewOnly ? (
            <Badge variant="secondary" className="w-full justify-center py-2 text-sm">
              <Eye className="h-4 w-4" /> {t("viewOnly")}
            </Badge>
          ) : (
            <>
              <Button className="w-full" size="lg" onClick={send} disabled={cart.length === 0 || pending}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {t("sendToKitchen")}
              </Button>

              {existing && role === "WAITER" && (
                existing.status === "BILL_REQUESTED" ? (
                  <Badge variant="warning" className="w-full justify-center py-2 text-sm">
                    <Receipt className="h-4 w-4" /> {t("billRequested")}
                  </Badge>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full"
                    size="lg"
                    onClick={askBill}
                    disabled={pending || existing.items.length === 0 || existing.status !== "SERVED"}
                  >
                    {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
                    {t("requestBill")}
                  </Button>
                )
              )}
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
