import { db } from "@/lib/db";

export async function getSettings() {
  const s = await db.settings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
  return {
    discountPercent: Number(s.discountPercent),
    serviceFeePercent: Number(s.serviceFeePercent),
    workStartMinute: s.workStartMinute,
    workEndMinute: s.workEndMinute,
  };
}

export function isWithinWorkHours(now: Date, startMinute: number, endMinute: number) {
  const minutes = now.getHours() * 60 + now.getMinutes();
  if (startMinute === endMinute) return true;
  if (startMinute < endMinute) return minutes >= startMinute && minutes < endMinute;
  // overnight range (e.g. 22:00 - 06:00)
  return minutes >= startMinute || minutes < endMinute;
}
