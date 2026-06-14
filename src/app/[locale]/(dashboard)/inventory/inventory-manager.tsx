"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Plus, Pencil, Trash2, PackagePlus, AlertTriangle, Package, Search, X, History, Scale } from "lucide-react";
import { toast } from "sonner";
import { tx, formatMoney, formatNumber, formatDateTime, cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { saveIngredient, addStock, deleteIngredient, getMovements, adjustStock } from "./actions";

type Ing = {
  id: string;
  name: Record<string, string>;
  unit: string;
  stockQty: number;
  minQty: number;
  costPerUnit: number;
};

export function InventoryManager({ ingredients }: { ingredients: Ing[] }) {
  const t = useTranslations("inventory");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [, startTransition] = useTransition();

  const [editDialog, setEditDialog] = useState<Ing | "new" | null>(null);
  const [stockDialog, setStockDialog] = useState<Ing | null>(null);
  const [historyDialog, setHistoryDialog] = useState<Ing | null>(null);
  const [adjustDialog, setAdjustDialog] = useState<Ing | null>(null);
  const [query, setQuery] = useState("");
  const [onlyLow, setOnlyLow] = useState(false);

  const lowCount = ingredients.filter((i) => i.stockQty <= i.minQty).length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ingredients.filter((i) => {
      if (onlyLow && i.stockQty > i.minQty) return false;
      if (q && !tx(i.name, locale).toLowerCase().includes(q)) return false;
      return true;
    });
  }, [ingredients, query, onlyLow, locale]);

  function run(fn: () => Promise<void>, ok = tc("saved")) {
    startTransition(async () => {
      try {
        await fn();
        toast.success(ok);
      } catch {
        toast.error(tc("error"));
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {lowCount > 0 ? (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3.5 w-3.5" /> {lowCount} {t("lowStockAlert")}
            </Badge>
          ) : (
            <span className="text-sm text-muted-foreground">{t("ok")}</span>
          )}
          <Button
            variant={onlyLow ? "default" : "outline"}
            size="sm"
            onClick={() => setOnlyLow((v) => !v)}
          >
            {t("onlyLow")}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tc("search")}
              className="h-9 w-40 pl-8 sm:w-52"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button onClick={() => setEditDialog("new")}>
            <Plus className="h-4 w-4" /> {t("addIngredient")}
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <th className="p-3">{t("ingredient")}</th>
                <th className="p-3">{t("stock")}</th>
                <th className="p-3">{t("minStock")}</th>
                <th className="p-3">{t("cost")}</th>
                <th className="p-3 text-right">{tc("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((i) => {
                const low = i.stockQty <= i.minQty;
                return (
                  <tr key={i.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3 font-medium">
                      <span className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        {tx(i.name, locale)}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={cn("font-semibold", low && "text-destructive")}>
                        {formatNumber(i.stockQty)} {i.unit}
                      </span>
                      {low && <Badge variant="destructive" className="ml-2">{t("lowStockAlert")}</Badge>}
                    </td>
                    <td className="p-3 text-muted-foreground">{formatNumber(i.minQty)} {i.unit}</td>
                    <td className="p-3">{formatMoney(i.costPerUnit)}</td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1">
                        <Button variant="outline" size="sm" onClick={() => setStockDialog(i)}>
                          <PackagePlus className="h-4 w-4" /> {t("addStock")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title={t("adjust")}
                          onClick={() => setAdjustDialog(i)}
                        >
                          <Scale className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title={t("history")}
                          onClick={() => setHistoryDialog(i)}
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditDialog(i)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => run(() => deleteIngredient(i.id), tc("deleted"))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    {tc("noData")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {editDialog && (
        <EditDialog
          ing={editDialog === "new" ? null : editDialog}
          onClose={() => setEditDialog(null)}
          onSave={(d) => run(() => saveIngredient(d))}
        />
      )}
      {stockDialog && (
        <StockDialog
          ing={stockDialog}
          onClose={() => setStockDialog(null)}
          onSave={(qty) => run(() => addStock(stockDialog.id, qty))}
        />
      )}
      {adjustDialog && (
        <AdjustDialog
          ing={adjustDialog}
          onClose={() => setAdjustDialog(null)}
          onSave={(counted, reason) => run(() => adjustStock(adjustDialog.id, counted, reason))}
        />
      )}
      {historyDialog && <HistoryDialog ing={historyDialog} onClose={() => setHistoryDialog(null)} />}
    </div>
  );
}

function AdjustDialog({
  ing,
  onClose,
  onSave,
}: {
  ing: Ing;
  onClose: () => void;
  onSave: (counted: number, reason: string) => void;
}) {
  const t = useTranslations("inventory");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [counted, setCounted] = useState(String(ing.stockQty));
  const [reason, setReason] = useState("");

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("adjust")} — {tx(ing.name, locale)}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            {t("stock")}: <b className="text-foreground">{formatNumber(ing.stockQty)} {ing.unit}</b>
          </div>
          <div className="space-y-1.5">
            <Label>{t("countedQty")} ({ing.unit})</Label>
            <Input type="number" value={counted} onChange={(e) => setCounted(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label>{t("reason")}</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{tc("cancel")}</Button>
          <Button
            disabled={counted === "" || Number(counted) < 0}
            onClick={() => {
              onSave(Number(counted), reason);
              onClose();
            }}
          >
            {tc("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type Movement = { id: string; type: string; qty: number; reason: string | null; createdAt: string };

const MOVE_STYLE: Record<string, string> = {
  IN: "text-success",
  OUT: "text-destructive",
  ADJUST: "text-warning",
};

function HistoryDialog({ ing, onClose }: { ing: Ing; onClose: () => void }) {
  const t = useTranslations("inventory");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [rows, setRows] = useState<Movement[] | null>(null);

  // Ochilganda harakatlarni yuklaymiz
  useEffect(() => {
    let active = true;
    getMovements(ing.id)
      .then((r) => active && setRows(r))
      .catch(() => active && setRows([]));
    return () => {
      active = false;
    };
  }, [ing.id]);

  const label = (type: string) =>
    type === "IN" ? t("moveIn") : type === "OUT" ? t("moveOut") : t("moveAdjust");

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("history")} — {tx(ing.name, locale)}</DialogTitle>
        </DialogHeader>
        {rows === null ? (
          <p className="py-8 text-center text-muted-foreground">{tc("loading")}</p>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">{t("noMovements")}</p>
        ) : (
          <div className="space-y-1.5">
            {rows.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                <div className="min-w-0">
                  <span className={cn("font-semibold", MOVE_STYLE[m.type])}>{label(m.type)}</span>
                  {m.reason && <span className="ml-2 text-muted-foreground">{m.reason}</span>}
                  <div className="text-xs text-muted-foreground">{formatDateTime(m.createdAt)}</div>
                </div>
                <span className={cn("font-semibold", MOVE_STYLE[m.type])}>
                  {m.qty > 0 ? "+" : ""}{formatNumber(m.qty)} {ing.unit}
                </span>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditDialog({
  ing,
  onClose,
  onSave,
}: {
  ing: Ing | null;
  onClose: () => void;
  onSave: (d: Parameters<typeof saveIngredient>[0]) => void;
}) {
  const t = useTranslations("inventory");
  const tm = useTranslations("menu");
  const tc = useTranslations("common");
  const [name, setName] = useState({
    uz: ing?.name.uz ?? "",
    ru: ing?.name.ru ?? "",
    en: ing?.name.en ?? "",
  });
  const [unit, setUnit] = useState(ing?.unit ?? "kg");
  const [minQty, setMinQty] = useState(String(ing?.minQty ?? 0));
  const [cost, setCost] = useState(String(ing?.costPerUnit ?? 0));
  const [stock, setStock] = useState(String(ing?.stockQty ?? 0));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{ing ? t("editIngredient") : t("addIngredient")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-3 gap-2">
            <F label={tm("nameUz")} value={name.uz} onChange={(v) => setName({ ...name, uz: v })} />
            <F label={tm("nameRu")} value={name.ru ?? ""} onChange={(v) => setName({ ...name, ru: v })} />
            <F label={tm("nameEn")} value={name.en ?? ""} onChange={(v) => setName({ ...name, en: v })} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <F label={t("unit")} value={unit} onChange={setUnit} />
            <F label={t("minStock")} type="number" value={minQty} onChange={setMinQty} />
            <F label={t("cost")} type="number" value={cost} onChange={setCost} />
          </div>
          {!ing && <F label={t("stock")} type="number" value={stock} onChange={setStock} />}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{tc("cancel")}</Button>
          <Button
            disabled={!name.uz || !unit}
            onClick={() => {
              onSave({ id: ing?.id, name, unit, minQty, costPerUnit: cost, stockQty: ing ? undefined : stock });
              onClose();
            }}
          >
            {tc("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StockDialog({ ing, onClose, onSave }: { ing: Ing; onClose: () => void; onSave: (qty: number) => void }) {
  const t = useTranslations("inventory");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [qty, setQty] = useState("");

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("addStock")} — {tx(ing.name, locale)}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label>{t("qtyToAdd")} ({ing.unit})</Label>
          <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} autoFocus />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{tc("cancel")}</Button>
          <Button
            disabled={!qty || Number(qty) <= 0}
            onClick={() => {
              onSave(Number(qty));
              onClose();
            }}
          >
            {tc("add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function F({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
