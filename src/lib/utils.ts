import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Localized JSON field { uz, ru, en } -> string for current locale */
export type LocalizedText = { uz?: string; ru?: string; en?: string } | null | undefined;

export function tx(value: unknown, locale: string): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  const obj = value as Record<string, string>;
  return obj[locale] || obj.uz || obj.ru || obj.en || Object.values(obj)[0] || "";
}

/** Group integer part with spaces — deterministic across server & client (avoids Intl locale drift). */
function groupThousands(s: string): string {
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/** Format a number/Decimal as UZS sum. */
export function formatMoney(value: number | string | { toString(): string }): string {
  const n = typeof value === "number" ? value : Number(value.toString());
  return `${groupThousands(String(Math.round(n)))} so'm`;
}

/** Deterministic date-time format (YYYY-MM-DD HH:mm) — same on server & client. */
export function formatDateTime(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function formatNumber(value: number | string | { toString(): string }): string {
  const n = typeof value === "number" ? value : Number(value.toString());
  const rounded = Math.round(n * 1000) / 1000;
  const [int, frac] = String(rounded).split(".");
  return frac ? `${groupThousands(int)}.${frac}` : groupThousands(int);
}
