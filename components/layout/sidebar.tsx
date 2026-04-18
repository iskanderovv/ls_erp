"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { AppRole } from "@/lib/auth/roles";
import { navItemsForRole } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function Sidebar({ role }: { role: AppRole }) {
  const pathname = usePathname();
  const items = navItemsForRole(role);

  return (
    <aside className="hidden w-64 border-r border-slate-200 bg-white p-4 lg:block">
      <div className="mb-6 px-2">
        <p className="text-lg font-semibold">O'quv Markaz ERP</p>
        <p className="text-xs text-slate-500">Ichki boshqaruv tizimi</p>
      </div>

      <nav className="space-y-1">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100",
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
