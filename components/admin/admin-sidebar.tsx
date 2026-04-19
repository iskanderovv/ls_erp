"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Boshqaruv paneli" },
  { href: "/admin/organizations", label: "Tashkilotlar" },
  { href: "/admin/subscriptions", label: "Obunalar" },
  { href: "/admin/plans", label: "Tariflar" },
  { href: "/admin/users", label: "Foydalanuvchilar" },
  { href: "/admin/analytics", label: "Analitika" },
  { href: "/admin/audit", label: "Audit" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 border-r border-slate-200 bg-white p-4 lg:block overflow-y-auto h-full">
      <div className="mb-6 px-2">
        <p className="text-lg font-semibold">Super Admin</p>
        <p className="text-xs text-slate-500">SaaS boshqaruv markazi</p>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-slate-900 !text-white hover:bg-slate-800 hover:!text-white"
                  : "text-slate-700 hover:bg-slate-100",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
