import type { ReactNode } from "react";

import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { requireSession } from "@/lib/auth/session";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireSession();

  return (
    <div className="flex min-h-screen">
      <Sidebar role={session.role} />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar firstName={session.firstName} lastName={session.lastName} role={session.role} />
        <MobileNav role={session.role} />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
