import type { ReactNode } from "react";
import Link from "next/link";

import { LogoutButton } from "@/components/layout/logout-button";
import { requirePagePermission } from "@/lib/auth/session";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requirePagePermission("admin.panel");

  const navItems = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/organizations", label: "Organizations" },
    { href: "/admin/subscriptions", label: "Subscriptions" },
    { href: "/admin/plans", label: "Plans" },
    { href: "/admin/users", label: "Users" },
    { href: "/admin/analytics", label: "Analytics" },
    { href: "/admin/audit", label: "Audit" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 lg:px-6">
          <div className="min-w-[180px]">
            <p className="text-lg font-semibold">Super Admin Panel</p>
            <p className="text-xs text-slate-500">SaaS control system</p>
          </div>
          <nav className="flex flex-wrap gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex h-8 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-xs font-medium hover:bg-slate-50"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/dashboard"
              className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium hover:bg-slate-50"
            >
              Asosiy dashboard
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-4 lg:p-6">{children}</main>
    </div>
  );
}
