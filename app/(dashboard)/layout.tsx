import type { ReactNode } from "react";

import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireSession();
  const organization = await prisma.organization.findUnique({
    where: { id: session.organizationId },
    select: { name: true },
  });
  const organizationName = organization?.name ?? "Tashkilot";

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role={session.role} organizationName={organizationName} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar firstName={session.firstName} lastName={session.lastName} role={session.role} />
        <MobileNav role={session.role} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
