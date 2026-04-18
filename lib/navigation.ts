import { hasPermission, type Permission } from "@/lib/auth/permissions";
import type { AppRole } from "@/lib/auth/roles";

type NavigationItem = {
  href: string;
  label: string;
  permission: Permission;
};

export const NAV_ITEMS: NavigationItem[] = [
  { href: "/dashboard", label: "Dashboard", permission: "dashboard.view" },
  { href: "/dashboard/branches", label: "Filiallar", permission: "branches.view" },
  { href: "/dashboard/students", label: "Talabalar", permission: "students.view" },
  { href: "/dashboard/leads", label: "Lidlar", permission: "leads.view" },
  { href: "/dashboard/teachers", label: "Ustozlar", permission: "teachers.view" },
  { href: "/dashboard/groups", label: "Guruhlar", permission: "groups.view" },
  { href: "/dashboard/attendance", label: "Davomat", permission: "attendance.view" },
  { href: "/dashboard/tasks", label: "Vazifalar", permission: "tasks.view" },
  { href: "/dashboard/reminders", label: "Eslatmalar", permission: "reminders.view" },
  { href: "/dashboard/finance", label: "Moliya", permission: "finance.view" },
  { href: "/dashboard/payments", label: "To'lovlar", permission: "payments.view" },
  { href: "/dashboard/debts", label: "Qarzlar", permission: "debts.view" },
  { href: "/dashboard/cash-flow", label: "Kassa oqimi", permission: "payments.view" },
  { href: "/dashboard/expenses", label: "Xarajatlar", permission: "expenses.view" },
  { href: "/dashboard/salaries", label: "Oyliklar", permission: "salary.view" },
  { href: "/dashboard/ledger", label: "Moliyaviy jurnal", permission: "ledger.view" },
  { href: "/dashboard/reports", label: "Hisobotlar", permission: "reports.view" },
  { href: "/dashboard/audit", label: "Audit jurnali", permission: "audit.view" },
];

export function navItemsForRole(role: AppRole) {
  return NAV_ITEMS.filter((item) => hasPermission(role, item.permission));
}
