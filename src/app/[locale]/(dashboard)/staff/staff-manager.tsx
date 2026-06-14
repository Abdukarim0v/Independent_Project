"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Plus, Pencil, Trash2, UserCircle, Search, X, Clock } from "lucide-react";
import { toast } from "sonner";
import type { Role } from "@prisma/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/misc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { saveStaff, toggleStaffActive, deleteStaff } from "./actions";

type Staff = {
  id: string;
  name: string;
  username: string;
  role: Role;
  isActive: boolean;
  workStartMinute: number | null;
  workEndMinute: number | null;
};

function minutesToTime(min: number) {
  const h = Math.floor(min / 60)
    .toString()
    .padStart(2, "0");
  const m = (min % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function timeToMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}
const ROLES: Role[] = ["ADMIN", "MANAGER", "WAITER", "COOK", "CASHIER"];

const ROLE_VARIANT: Record<Role, "destructive" | "default" | "info" | "warning" | "success"> = {
  ADMIN: "destructive",
  MANAGER: "default",
  WAITER: "info",
  COOK: "warning",
  CASHIER: "success",
};

export function StaffManager({ staff, currentUserId }: { staff: Staff[]; currentUserId: string }) {
  const t = useTranslations("staff");
  const tr = useTranslations("roles");
  const tc = useTranslations("common");
  const [, startTransition] = useTransition();
  const [dialog, setDialog] = useState<Staff | "new" | null>(null);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "ALL">("ALL");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return staff.filter((u) => {
      if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
      if (q && !u.name.toLowerCase().includes(q) && !u.username.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [staff, query, roleFilter]);

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
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as Role | "ALL")}
            className="border-input flex h-9 rounded-md border bg-transparent px-2 text-sm"
          >
            <option value="ALL">{t("allRoles")}</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {tr(r)}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={() => setDialog("new")}>
          <Plus className="h-4 w-4" /> {t("addStaff")}
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <th className="p-3">{t("name")}</th>
                <th className="p-3">{t("username")}</th>
                <th className="p-3">{t("role")}</th>
                <th className="p-3">{t("active")}</th>
                <th className="p-3 text-right">{tc("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((u) => (
                <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3 font-medium">
                    <span className="flex items-center gap-2">
                      <UserCircle className="h-5 w-5 text-muted-foreground" />
                      {u.name}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground">{u.username}</td>
                  <td className="p-3">
                    <Badge variant={ROLE_VARIANT[u.role]}>{tr(u.role)}</Badge>
                  </td>
                  <td className="p-3">
                    <Switch
                      checked={u.isActive}
                      disabled={u.id === currentUserId}
                      onCheckedChange={(v) => run(() => toggleStaffActive(u.id, v))}
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDialog(u)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        disabled={u.id === currentUserId}
                        onClick={() => run(() => deleteStaff(u.id), tc("deleted"))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
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

      {dialog && (
        <StaffDialog
          staff={dialog === "new" ? null : dialog}
          onClose={() => setDialog(null)}
          onSave={(d) => run(() => saveStaff(d))}
        />
      )}
    </div>
  );
}

function StaffDialog({
  staff,
  onClose,
  onSave,
}: {
  staff: Staff | null;
  onClose: () => void;
  onSave: (d: Parameters<typeof saveStaff>[0]) => void;
}) {
  const t = useTranslations("staff");
  const tr = useTranslations("roles");
  const tc = useTranslations("common");
  const [name, setName] = useState(staff?.name ?? "");
  const [username, setUsername] = useState(staff?.username ?? "");
  const [role, setRole] = useState<Role>(staff?.role ?? "WAITER");
  const [isActive, setIsActive] = useState(staff?.isActive ?? true);
  const [password, setPassword] = useState("");
  const [customHours, setCustomHours] = useState(
    staff?.workStartMinute != null && staff?.workEndMinute != null,
  );
  const [workStart, setWorkStart] = useState(
    minutesToTime(staff?.workStartMinute ?? 420),
  );
  const [workEnd, setWorkEnd] = useState(
    minutesToTime(staff?.workEndMinute ?? 1200),
  );

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{staff ? t("editStaff") : t("addStaff")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label>{t("name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("username")}</Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("role")}</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {tr(r)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("password")}</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <p className="text-xs text-muted-foreground">{t("passwordHint")}</p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={isActive} onCheckedChange={setIsActive} /> {t("active")}
          </label>

          {role !== "ADMIN" && role !== "MANAGER" && (
            <div className="space-y-2 rounded-lg border p-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Switch checked={customHours} onCheckedChange={setCustomHours} />
                {t("customWorkHours")}
              </label>
              <p className="text-xs text-muted-foreground">{t("customWorkHoursHint")}</p>
              {customHours && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" /> {t("workStart")}
                    </Label>
                    <Input type="time" value={workStart} onChange={(e) => setWorkStart(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" /> {t("workEnd")}
                    </Label>
                    <Input type="time" value={workEnd} onChange={(e) => setWorkEnd(e.target.value)} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{tc("cancel")}</Button>
          <Button
            disabled={!name || username.length < 3}
            onClick={() => {
              onSave({
                id: staff?.id,
                name,
                username,
                role,
                isActive,
                password: password || undefined,
                workStartMinute: customHours ? timeToMinutes(workStart) : null,
                workEndMinute: customHours ? timeToMinutes(workEnd) : null,
              });
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
