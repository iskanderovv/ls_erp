import { LogoutButton } from "@/components/layout/logout-button";
import { NotificationBell } from "@/components/notifications/notification-bell";
import type { AppRole } from "@/lib/auth/roles";

type TopbarProps = {
  firstName: string;
  lastName: string;
  role: AppRole;
};

export function Topbar({ firstName, lastName, role }: TopbarProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-6">
      <div>
        <p className="text-sm text-slate-500">Xush kelibsiz</p>
        <p className="text-sm font-semibold">
          {firstName} {lastName}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <NotificationBell />
        <LogoutButton />
      </div>
    </header>
  );
}
