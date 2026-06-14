"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Armchair, Users, Plus, Pencil, Trash2, CalendarPlus, Search, X, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { formatMoney, formatDateTime, cn } from "@/lib/utils";
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
import { saveTable, deleteTable, setTableStatus, createReservation, cancelReservation } from "./actions";

const STATUS_STYLE: Record<string, string> = {
  FREE: "border-success/40 bg-success/5 hover:border-success",
  OCCUPIED: "border-primary/50 bg-primary/5 hover:border-primary",
  RESERVED: "border-info/40 bg-info/5",
  BILL: "border-warning/50 bg-warning/10",
};

type Reservation = {
  guestName: string;
  phone: string | null;
  partySize: number;
  time: string;
  note: string | null;
};

type Tbl = {
  id: string;
  number: number;
  capacity: number;
  zone: string;
  status: string;
  order: { number: number; total: number; status: string } | null;
  reservation: Reservation | null;
};

const STATUSES = ["FREE", "OCCUPIED", "RESERVED", "BILL"] as const;

export function TablesManager({
  tables,
  zones,
  zoneNames,
  locale,
  canManage,
}: {
  tables: Tbl[];
  zones: string[];
  zoneNames: Record<string, string>;
  locale: string;
  canManage: boolean;
}) {
  const t = useTranslations("tables");
  const tc = useTranslations("common");
  const [, startTransition] = useTransition();
  const [editDialog, setEditDialog] = useState<Tbl | "new" | null>(null);
  const [reserveDialog, setReserveDialog] = useState<Tbl | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const zoneLabel = (z: string) => zoneNames[z] ?? z;
  const effStatus = (tb: Tbl) => (tb.order ? "OCCUPIED" : tb.status);

  const filtered = useMemo(() => {
    const q = query.trim();
    return tables.filter((tb) => {
      if (q && !String(tb.number).includes(q)) return false;
      if (statusFilter !== "ALL" && effStatus(tb) !== statusFilter) return false;
      return true;
    });
  }, [tables, query, statusFilter]);

  function run(fn: () => Promise<void>, ok = tc("saved")) {
    startTransition(async () => {
      try {
        await fn();
        toast.success(ok);
      } catch (e) {
        if (e instanceof Error && e.message === "TABLE_HAS_ACTIVE_ORDER") {
          toast.error(t("errorHasOrders"));
        } else {
          toast.error(tc("error"));
        }
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex flex-wrap items-center gap-3">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter((cur) => (cur === s ? "ALL" : s))}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-2 py-1 transition-colors",
                statusFilter === s ? "bg-muted font-semibold" : "hover:bg-muted/60",
              )}
            >
              <span className={cn("h-3 w-3 rounded-full border-2", STATUS_STYLE[s])} />
              {t(s.toLowerCase() as "free")}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("tableNumber")}
              className="h-9 w-32 pl-8"
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
          {canManage && (
            <Button onClick={() => setEditDialog("new")}>
              <Plus className="h-4 w-4" /> {t("addTable")}
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {zones.map((zone) => {
          const zoneTables = filtered.filter((tb) => tb.zone === zone);
          if (zoneTables.length === 0) return null;
          return (
            <div key={zone}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {zoneLabel(zone)}
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {zoneTables.map((tb) => {
                  const status = effStatus(tb);
                  return (
                    <div key={tb.id} className="group relative">
                      <Link
                        href={`/${locale}/pos?table=${tb.id}`}
                        className={cn(
                          "flex h-full flex-col gap-2 rounded-xl border-2 p-4 transition-all hover:shadow-md",
                          STATUS_STYLE[status] ?? STATUS_STYLE.FREE,
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-lg font-bold">
                            <Armchair className="h-5 w-5" /> {tb.number}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="h-3.5 w-3.5" /> {tb.capacity}
                          </span>
                        </div>

                        {tb.order ? (
                          <>
                            <Badge
                              variant={
                                tb.order.status === "BILL_REQUESTED"
                                  ? "warning"
                                  : tb.order.status === "READY"
                                    ? "success"
                                    : "default"
                              }
                              className="w-fit"
                            >
                              {t(tb.order.status === "BILL_REQUESTED" || tb.order.status === "READY" ? "bill" : "occupied")}
                            </Badge>
                            <div className="mt-auto text-sm">
                              <div className="font-semibold text-primary">{formatMoney(tb.order.total)}</div>
                              <div className="text-xs text-muted-foreground">#{tb.order.number}</div>
                            </div>
                          </>
                        ) : tb.reservation ? (
                          <>
                            <Badge variant="info" className="w-fit">{t("reserved")}</Badge>
                            <div className="mt-auto text-xs">
                              <div className="flex items-center gap-1 font-medium">
                                <CalendarClock className="h-3 w-3" /> {tb.reservation.guestName}
                              </div>
                              <div className="text-muted-foreground">{formatDateTime(tb.reservation.time)}</div>
                            </div>
                          </>
                        ) : status === "BILL" ? (
                          <Badge variant="warning" className="mt-auto w-fit">{t("bill")}</Badge>
                        ) : (
                          <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-success opacity-0 transition-opacity group-hover:opacity-100">
                            <Plus className="h-4 w-4" /> {t("newOrder")}
                          </span>
                        )}
                      </Link>

                      {canManage && (
                        <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          {tb.reservation ? (
                            <Button
                              variant="secondary"
                              size="icon"
                              className="h-7 w-7"
                              title={t("cancelReservation")}
                              onClick={() => run(() => cancelReservation(tb.id), tc("deleted"))}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            !tb.order && (
                              <Button
                                variant="secondary"
                                size="icon"
                                className="h-7 w-7"
                                title={t("reserve")}
                                onClick={() => setReserveDialog(tb)}
                              >
                                <CalendarPlus className="h-3.5 w-3.5" />
                              </Button>
                            )
                          )}
                          <Button
                            variant="secondary"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setEditDialog(tb)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              if (confirm(t("deleteConfirm", { number: tb.number }))) {
                                run(() => deleteTable(tb.id), tc("deleted"));
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}

                      {/* Qo'lda status (faqat boshqaruvchi, faol buyurtmasiz) */}
                      {canManage && !tb.order && (
                        <select
                          value={tb.status}
                          onChange={(e) => run(() => setTableStatus(tb.id, e.target.value as "FREE"))}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-2 hidden h-7 w-full rounded-md border border-input bg-background px-2 text-xs group-hover:block"
                          title={t("setStatus")}
                        >
                          {STATUSES.filter((s) => s !== "OCCUPIED").map((s) => (
                            <option key={s} value={s}>
                              {t(s.toLowerCase() as "free")}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="py-12 text-center text-muted-foreground">{tc("noData")}</p>
        )}
      </div>

      {editDialog && (
        <EditDialog
          tbl={editDialog === "new" ? null : editDialog}
          zoneNames={zoneNames}
          onClose={() => setEditDialog(null)}
          onSave={(d) => run(() => saveTable(d))}
        />
      )}
      {reserveDialog && (
        <ReserveDialog
          tbl={reserveDialog}
          onClose={() => setReserveDialog(null)}
          onSave={(d) => run(() => createReservation(d))}
        />
      )}
    </div>
  );
}

function EditDialog({
  tbl,
  zoneNames,
  onClose,
  onSave,
}: {
  tbl: Tbl | null;
  zoneNames: Record<string, string>;
  onClose: () => void;
  onSave: (d: Parameters<typeof saveTable>[0]) => void;
}) {
  const t = useTranslations("tables");
  const tc = useTranslations("common");
  const [number, setNumber] = useState(String(tbl?.number ?? ""));
  const [capacity, setCapacity] = useState(String(tbl?.capacity ?? 4));
  const [zone, setZone] = useState(tbl?.zone ?? "main");

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tbl ? t("editTable") : t("addTable")}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1.5">
            <Label>{t("tableNumber")}</Label>
            <Input type="number" value={number} onChange={(e) => setNumber(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label>{t("capacity")}</Label>
            <Input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("zone")}</Label>
            <select
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              className="border-input bg-transparent flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs"
            >
              {Object.entries(zoneNames).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{tc("cancel")}</Button>
          <Button
            disabled={!number || !capacity}
            onClick={() => {
              onSave({ id: tbl?.id, number, capacity, zone });
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

function ReserveDialog({
  tbl,
  onClose,
  onSave,
}: {
  tbl: Tbl;
  onClose: () => void;
  onSave: (d: Parameters<typeof createReservation>[0]) => void;
}) {
  const t = useTranslations("tables");
  const tc = useTranslations("common");
  const [guestName, setGuestName] = useState("");
  const [phone, setPhone] = useState("");
  const [partySize, setPartySize] = useState(String(Math.min(2, tbl.capacity)));
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("reserve")} — {t("table")} {tbl.number}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label>{t("guestName")}</Label>
            <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>{t("phone")}</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998..." />
            </div>
            <div className="space-y-1.5">
              <Label>{t("partySize")}</Label>
              <Input type="number" value={partySize} onChange={(e) => setPartySize(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{t("time")}</Label>
            <Input type="datetime-local" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("note")}</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{tc("cancel")}</Button>
          <Button
            disabled={!guestName || !time || !partySize}
            onClick={() => {
              onSave({ tableId: tbl.id, guestName, phone, partySize, time, note });
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
