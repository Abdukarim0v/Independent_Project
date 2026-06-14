import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { getSettings } from "@/lib/settings";
import { PageHeader } from "@/components/dashboard/page-header";
import { SettingsPanel } from "./settings-panel";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const t = await getTranslations("settings");
  const session = await auth();
  const settings = await getSettings();
  return (
    <div className="animate-fade-in">
      <PageHeader title={t("title")} />
      <SettingsPanel
        name={session?.user.name ?? ""}
        username={session?.user.username ?? ""}
        role={session?.user.role ?? "WAITER"}
        settings={settings}
      />
    </div>
  );
}
