"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { AppRole } from "@/lib/auth/roles";
import { navItemsForRole } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function MobileNav({ role }: { role: AppRole }) {
  const pathname = usePathname();
  const items = navItemsForRole(role);

  return (
    <div className="border-b border-slate-200 bg-white px-4 py-2 lg:hidden">
      <div className="flex gap-2 overflow-x-auto">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "whitespace-nowrap rounded-md px-3 py-1.5 text-sm",
                active
                  ? "bg-slate-900 !text-white hover:bg-slate-800 hover:!text-white"
                  : "bg-slate-100 text-slate-700",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
