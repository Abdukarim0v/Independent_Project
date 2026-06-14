import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/dashboard/page-header";
import { StaffManager } from "./staff-manager";

export const dynamic = "force-dynamic";

export default async function StaffPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await auth();
  if (session?.user.role !== "ADMIN") redirect(`/${locale}`);

  const t = await getTranslations("staff");
  const users = await db.user.findMany({ orderBy: { createdAt: "asc" } });

  const data = users.map((u) => ({
    id: u.id,
    name: u.name,
    username: u.username,
    role: u.role,
    isActive: u.isActive,
    workStartMinute: u.workStartMinute,
    workEndMinute: u.workEndMinute,
  }));

  return (
    <div className="animate-fade-in">
      <PageHeader title={t("title")} />
      <StaffManager staff={data} currentUserId={session.user.id} />
    </div>
  );
}
