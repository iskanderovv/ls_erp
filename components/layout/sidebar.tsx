"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { AppRole } from "@/lib/auth/roles";
import { navGroupsForRole } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function Sidebar({ role }: { role: AppRole }) {
  const pathname = usePathname();
  const groups = navGroupsForRole(role);

  return (
    <aside className="hidden w-64 border-r border-slate-200 bg-white p-4 lg:block overflow-y-auto h-full">
      <div className="mb-6 px-2">
        <p className="text-lg font-semibold">EduMarkaz</p>
        <p className="text-xs text-slate-500">Ichki boshqaruv tizimi</p>
      </div>

      <nav className="space-y-6">
        {groups.map((group) => (
          <div key={group.title} className="space-y-1">
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {group.title}
            </p>
            {group.items.map((item) => {
              const active =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-slate-900 !text-white hover:bg-slate-800 hover:!text-white"
                      : "text-slate-700 hover:bg-slate-100",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
