import type { ReactNode } from "react";
import Link from "next/link";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { LogoutButton } from "@/components/layout/logout-button";
import { requirePagePermission } from "@/lib/auth/session";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requirePagePermission("admin.panel");

  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-hidden bg-slate-50">
        <header className="border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between px-4 py-4 lg:px-6">
            <div>
              <p className="text-lg font-semibold">Super admin paneli</p>
              <p className="text-xs text-slate-500">SaaS boshqaruv tizimi</p>
            </div>
            <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium hover:bg-slate-50"
            >
              Asosiy panel
            </Link>
            <LogoutButton />
          </div>
        </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
