import { getTranslations } from "next-intl/server";
import { Radio } from "lucide-react";
import { requirePageAccess } from "@/lib/guard";
import { PageHeader } from "@/components/dashboard/page-header";
import { KitchenBoard } from "./kitchen-board";

export default async function KitchenPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await requirePageAccess(locale, "kitchen");
  const t = await getTranslations("kitchen");
  return (
    <div className="animate-fade-in">
      <PageHeader
        title={t("title")}
        action={
          <span className="flex items-center gap-2 rounded-full bg-success/10 px-3 py-1 text-sm font-medium text-success">
            <Radio className="h-4 w-4 animate-pulse" /> {t("live")}
          </span>
        }
      />
      <KitchenBoard canAct={user.role === "COOK"} />
    </div>
  );
}
