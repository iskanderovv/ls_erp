import { hasPermission, type Permission } from "@/lib/auth/permissions";
import type { AppRole } from "@/lib/auth/roles";
import { 
  LayoutDashboard, 
  Building2, 
  Users2, 
  UserSquare2, 
  GraduationCap, 
  Users, 
  CalendarCheck, 
  CheckSquare, 
  Bell, 
  Wallet, 
  CreditCard, 
  BadgeAlert, 
  ArrowLeftRight, 
  Receipt, 
  Banknote, 
  History, 
  BarChart3, 
  ShieldCheck 
} from "lucide-react";

type NavigationItem = {
  href: string;
  label: string;
  permission: Permission;
  icon: any;
};

export const NAV_ITEMS: NavigationItem[] = [
  { href: "/dashboard", label: "Dashboard", permission: "dashboard.view", icon: LayoutDashboard },
  { href: "/dashboard/branches", label: "Filiallar", permission: "branches.view", icon: Building2 },
  { href: "/dashboard/students", label: "Talabalar", permission: "students.view", icon: Users2 },
  { href: "/dashboard/leads", label: "Lidlar", permission: "leads.view", icon: UserSquare2 },
  { href: "/dashboard/teachers", label: "Ustozlar", permission: "teachers.view", icon: GraduationCap },
  { href: "/dashboard/groups", label: "Guruhlar", permission: "groups.view", icon: Users },
  { href: "/dashboard/attendance", label: "Davomat", permission: "attendance.view", icon: CalendarCheck },
  { href: "/dashboard/tasks", label: "Vazifalar", permission: "tasks.view", icon: CheckSquare },
  { href: "/dashboard/reminders", label: "Eslatmalar", permission: "reminders.view", icon: Bell },
  { href: "/dashboard/finance", label: "Moliya", permission: "finance.view", icon: Wallet },
  { href: "/dashboard/payments", label: "To'lovlar", permission: "payments.view", icon: CreditCard },
  { href: "/dashboard/debts", label: "Qarzlar", permission: "debts.view", icon: BadgeAlert },
  { href: "/dashboard/cash-flow", label: "Kassa oqimi", permission: "payments.view", icon: ArrowLeftRight },
  { href: "/dashboard/expenses", label: "Xarajatlar", permission: "expenses.view", icon: Receipt },
  { href: "/dashboard/salaries", label: "Oyliklar", permission: "salary.view", icon: Banknote },
  { href: "/dashboard/ledger", label: "Moliyaviy jurnal", permission: "ledger.view", icon: History },
  { href: "/dashboard/reports", label: "Hisobotlar", permission: "reports.view", icon: BarChart3 },
  { href: "/dashboard/audit", label: "Audit jurnali", permission: "audit.view", icon: ShieldCheck },
];

export function navItemsForRole(role: AppRole) {
  return NAV_ITEMS.filter((item) => hasPermission(role, item.permission));
}
