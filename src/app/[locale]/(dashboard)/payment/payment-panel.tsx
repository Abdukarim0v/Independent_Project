"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Banknote, CreditCard, Printer, Check, Loader2, ArrowLeft, UtensilsCrossed, SplitSquareHorizontal, Eye } from "lucide-react";
import { toast } from "sonner";
import { tx, formatMoney, cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator, Switch } from "@/components/ui/misc";
import type { Role } from "@prisma/client";
import { payOrder } from "./actions";

type OrderItem = { id: string; name: Record<string, string>; qty: number; unitPrice: number };

type Order = {
  id: string;
  number: number;
  type: string;
  status: string;
  total: number;
  discount: number;
  tip: number;
  tableNumber: number | null;
  paidAt: string | null;
  payments: { method: string; amount: number }[];
  createdAtLabel: string;
  items: OrderItem[];
};

type Settings = { discountPercent: number; serviceFeePercent: number };

export function PaymentPanel({ order, settings, role }: { order: Order; settings: Settings; role: Role }) {
  const t = useTranslations("payment");
  const tc = useTranslations("common");
  const ttbl = useTranslations("tables");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [method, setMethod] = useState<"CASH" | "CARD">("CASH");
  const [received, setReceived] = useState("");
  const [split, setSplit] = useState(false);
  const [cashPart, setCashPart] = useState("");

  const paid = order.status === "PAID";
  const billRequested = order.status === "BILL_REQUESTED";

  const subtotal = order.items.reduce((s, i) => s + i.unitPrice * i.qty, 0);

  const viewOnly = role !== "CASHIER";
  const discountN = (subtotal * settings.discountPercent) / 100;
  const tipN = (subtotal * settings.serviceFeePercent) / 100;
  const grandTotal = useMemo(() => Math.max(0, subtotal - discountN + tipN), [subtotal, discountN, tipN]);

  const cashN = Math.min(grandTotal, Math.max(0, Number(cashPart) || 0));
  const cardN = Math.max(0, grandTotal - cashN);
  const change = !split && method === "CASH" && received ? Math.max(0, Number(received) - grandTotal) : 0;

  function pay() {
    const payments = split
      ? [
          ...(cashN > 0 ? [{ method: "CASH" as const, amount: cashN }] : []),
          ...(cardN > 0 ? [{ method: "CARD" as const, amount: cardN }] : []),
        ]
      : [{ method, amount: grandTotal }];

    if (payments.length === 0) {
      toast.error(t("mismatch"));
      return;
    }

    startTransition(async () => {
      try {
        await payOrder({
          orderId: order.id,
          payments,
        });
        toast.success(t("paid"));
        setReceived("");
        setCashPart("");
        router.refresh();
      } catch (e) {
        if (e instanceof Error && e.message === "AMOUNT_MISMATCH") toast.error(t("mismatch"));
        else if (e instanceof Error && e.message === "BILL_NOT_REQUESTED") toast.error(t("billNotRequested"));
        else toast.error(tc("error"));
      }
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      {/* Receipt */}
      <Card className="print-receipt p-6">
        <div className="mb-4 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <UtensilsCrossed className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold">{tc("appFull")}</h2>
          <p className="text-xs text-muted-foreground">
            {t("receipt")} #{order.number} ·{" "}
            {order.tableNumber ? `${ttbl("table")} ${order.tableNumber}` : t("title")}
          </p>
          <p className="text-xs text-muted-foreground">{order.createdAtLabel}</p>
        </div>

        <Separator />
        <div className="space-y-2 py-4">
          {order.items.map((i) => (
            <div key={i.id} className="flex justify-between text-sm">
              <span>
                {tx(i.name, locale)} <span className="text-muted-foreground">×{i.qty}</span>
              </span>
              <span className="font-medium">{formatMoney(i.unitPrice * i.qty)}</span>
            </div>
          ))}
        </div>
        <Separator />

        {/* Subtotal / discount / tip lines */}
        <div className="space-y-1 py-3 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>{t("subtotalLabel")}</span>
            <span>{formatMoney(paid ? order.total : subtotal)}</span>
          </div>
          {(paid ? order.discount : discountN) > 0 && (
            <div className="flex justify-between text-destructive">
              <span>{t("discount")}</span>
              <span>− {formatMoney(paid ? order.discount : discountN)}</span>
            </div>
          )}
          {(paid ? order.tip : tipN) > 0 && (
            <div className="flex justify-between text-success">
              <span>{t("tip")}</span>
              <span>+ {formatMoney(paid ? order.tip : tipN)}</span>
            </div>
          )}
        </div>
        <Separator />

        <div className="flex items-center justify-between py-4 text-xl font-bold">
          <span>{t("grandTotal")}</span>
          <span className="text-primary">
            {formatMoney(paid ? order.total - order.discount + order.tip : grandTotal)}
          </span>
        </div>

        {paid && (
          <div className="rounded-lg bg-success/10 p-3 text-center text-sm text-success">
            <Check className="mx-auto mb-1 h-5 w-5" />
            {t("paid")}
            <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
              {order.payments.map((p, i) => (
                <div key={i}>
                  {p.method === "CASH" ? t("cash") : t("card")}: {formatMoney(p.amount)}
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{t("thanks")}</p>
          </div>
        )}
      </Card>

      {/* Actions */}
      <div className="no-print space-y-4">
        {!paid && viewOnly ? (
          <Card className="p-5">
            <Badge variant="secondary" className="w-full justify-center py-2 text-sm">
              <Eye className="h-4 w-4" /> {t("viewOnly")}
            </Badge>
          </Card>
        ) : !paid ? (
          <Card className="space-y-4 p-5">
            {/* discount + service fee (computed from admin settings) */}
            {(settings.discountPercent > 0 || settings.serviceFeePercent > 0) && (
              <div className="space-y-1 rounded-lg bg-muted/50 p-2.5 text-sm">
                {settings.discountPercent > 0 && (
                  <div className="flex justify-between text-destructive">
                    <span>{t("discount")} ({settings.discountPercent}%)</span>
                    <span>− {formatMoney(discountN)}</span>
                  </div>
                )}
                {settings.serviceFeePercent > 0 && (
                  <div className="flex justify-between text-success">
                    <span>{t("tip")} ({settings.serviceFeePercent}%)</span>
                    <span>+ {formatMoney(tipN)}</span>
                  </div>
                )}
              </div>
            )}

            {/* split toggle */}
            <label className="flex items-center justify-between rounded-lg border p-2.5 text-sm">
              <span className="flex items-center gap-2">
                <SplitSquareHorizontal className="h-4 w-4" /> {t("split")}
              </span>
              <Switch checked={split} onCheckedChange={setSplit} />
            </label>

            {!split ? (
              <>
                <div>
                  <p className="mb-2 text-sm font-medium">{t("method")}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setMethod("CASH")}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-lg border-2 p-4 transition-colors",
                        method === "CASH" ? "border-primary bg-primary/5" : "",
                      )}
                    >
                      <Banknote className="h-6 w-6" /> {t("cash")}
                    </button>
                    <button
                      onClick={() => setMethod("CARD")}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-lg border-2 p-4 transition-colors",
                        method === "CARD" ? "border-primary bg-primary/5" : "",
                      )}
                    >
                      <CreditCard className="h-6 w-6" /> {t("card")}
                    </button>
                  </div>
                </div>

                {method === "CASH" && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">{t("received")}</p>
                    <Input
                      type="number"
                      value={received}
                      onChange={(e) => setReceived(e.target.value)}
                      placeholder="0"
                    />
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t("change")}</span>
                      <span className="font-bold">{formatMoney(change)}</span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-2">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <Banknote className="h-4 w-4 text-success" /> {t("cashPart")}
                  </Label>
                  <Input type="number" value={cashPart} onChange={(e) => setCashPart(e.target.value)} placeholder="0" />
                </div>
                <div className="flex items-center justify-between rounded-lg bg-info/5 p-2.5 text-sm">
                  <span className="flex items-center gap-1.5">
                    <CreditCard className="h-4 w-4 text-info" /> {t("cardPart")}
                  </span>
                  <span className="font-semibold">{formatMoney(cardN)}</span>
                </div>
              </div>
            )}

            {!billRequested && (
              <p className="text-center text-xs text-muted-foreground">{t("billNotRequested")}</p>
            )}

            <Button className="w-full" size="lg" onClick={pay} disabled={pending || !billRequested}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {t("pay")} · {formatMoney(grandTotal)}
            </Button>
          </Card>
        ) : (
          <Card className="space-y-3 p-5">
            <Button className="w-full" size="lg" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> {t("print")}
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href={`/${locale}/tables`}>
                <ArrowLeft className="h-4 w-4" /> {tc("back")}
              </Link>
            </Button>
          </Card>
        )}

        <Badge variant={paid ? "success" : "warning"} className="w-full justify-center py-1.5">
          {paid ? t("paid") : t("checkout")}
        </Badge>
      </div>
    </div>
  );
}
