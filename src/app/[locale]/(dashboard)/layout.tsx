import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { ReadyOrdersNotifier } from "@/components/dashboard/ready-orders-notifier";
import { BillRequestsNotifier } from "@/components/dashboard/bill-requests-notifier";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  const { name, role } = session.user;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar role={role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header name={name ?? ""} role={role} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {role === "WAITER" && <ReadyOrdersNotifier />}
          {(role === "CASHIER" || role === "ADMIN" || role === "MANAGER") && <BillRequestsNotifier />}
          {children}
        </main>
      </div>
    </div>
  );
}
