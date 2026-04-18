import type { AppRole } from "@/lib/auth/roles";

const APP_ALL_ROLES: readonly AppRole[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "TEACHER",
  "ACCOUNTANT",
];

export const PERMISSIONS = {
  "dashboard.view": APP_ALL_ROLES,
  "branches.view": ["SUPER_ADMIN", "ADMIN"],
  "branches.manage": ["SUPER_ADMIN", "ADMIN"],
  "students.view": ["SUPER_ADMIN", "ADMIN", "MANAGER", "TEACHER"],
  "students.manage": ["SUPER_ADMIN", "ADMIN", "MANAGER"],
  "leads.view": ["SUPER_ADMIN", "ADMIN", "MANAGER"],
  "leads.manage": ["SUPER_ADMIN", "ADMIN", "MANAGER"],
  "teachers.view": ["SUPER_ADMIN", "ADMIN", "MANAGER"],
  "teachers.manage": ["SUPER_ADMIN", "ADMIN"],
  "groups.view": ["SUPER_ADMIN", "ADMIN", "MANAGER", "TEACHER"],
  "groups.manage": ["SUPER_ADMIN", "ADMIN", "MANAGER"],
  "attendance.view": ["SUPER_ADMIN", "ADMIN", "MANAGER", "TEACHER"],
  "attendance.manage": ["SUPER_ADMIN", "ADMIN", "MANAGER", "TEACHER"],
  "notifications.view": APP_ALL_ROLES,
  "payments.view": ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT"],
  "payments.manage": ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT"],
  "debts.view": ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT"],
  "reminders.view": ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT", "MANAGER"],
  "reminders.manage": ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT", "MANAGER"],
  "tasks.view": APP_ALL_ROLES,
  "tasks.manage": ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT", "MANAGER"],
  "automation.run": ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT", "MANAGER"],
  "telegram.manage": ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT", "MANAGER"],
  "finance.view": ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT"],
  "expenses.view": ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT"],
  "expenses.manage": ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT"],
  "salary.view": ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT"],
  "salary.manage": ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT"],
  "ledger.view": ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT"],
  "reports.view": ["SUPER_ADMIN", "ADMIN", "ACCOUNTANT"],
  "audit.view": ["SUPER_ADMIN", "ADMIN"],
} as const satisfies Record<string, readonly AppRole[]>;

export type Permission = keyof typeof PERMISSIONS;

const PATH_PERMISSIONS: Array<{ prefix: string; permission: Permission }> = [
  { prefix: "/dashboard/branches", permission: "branches.view" },
  { prefix: "/dashboard/students", permission: "students.view" },
  { prefix: "/dashboard/leads", permission: "leads.view" },
  { prefix: "/dashboard/teachers", permission: "teachers.view" },
  { prefix: "/dashboard/groups", permission: "groups.view" },
  { prefix: "/dashboard/attendance", permission: "attendance.view" },
  { prefix: "/dashboard/tasks", permission: "tasks.view" },
  { prefix: "/dashboard/reminders", permission: "reminders.view" },
  { prefix: "/dashboard/payments", permission: "payments.view" },
  { prefix: "/dashboard/debts", permission: "debts.view" },
  { prefix: "/dashboard/cash-flow", permission: "payments.view" },
  { prefix: "/dashboard/finance", permission: "finance.view" },
  { prefix: "/dashboard/expenses", permission: "expenses.view" },
  { prefix: "/dashboard/salaries", permission: "salary.view" },
  { prefix: "/dashboard/ledger", permission: "ledger.view" },
  { prefix: "/dashboard/reports", permission: "reports.view" },
  { prefix: "/dashboard/audit", permission: "audit.view" },
];

const API_PERMISSIONS: Array<{ prefix: string; permission: Permission }> = [
  { prefix: "/api/branches", permission: "branches.manage" },
  { prefix: "/api/students", permission: "students.manage" },
  { prefix: "/api/leads", permission: "leads.manage" },
  { prefix: "/api/teachers", permission: "teachers.manage" },
  { prefix: "/api/groups", permission: "groups.manage" },
  { prefix: "/api/attendance", permission: "attendance.manage" },
  { prefix: "/api/notifications", permission: "notifications.view" },
  { prefix: "/api/tasks", permission: "tasks.view" },
  { prefix: "/api/automation", permission: "automation.run" },
  { prefix: "/api/telegram", permission: "telegram.manage" },
  { prefix: "/api/payments", permission: "payments.view" },
  { prefix: "/api/student-fees", permission: "payments.manage" },
  { prefix: "/api/debts", permission: "debts.view" },
  { prefix: "/api/payment-reminders", permission: "reminders.view" },
  { prefix: "/api/dashboard/finance-summary", permission: "finance.view" },
  { prefix: "/api/dashboard/smart", permission: "dashboard.view" },
  { prefix: "/api/expenses", permission: "expenses.view" },
  { prefix: "/api/salary", permission: "salary.view" },
  { prefix: "/api/ledger", permission: "ledger.view" },
  { prefix: "/api/reports", permission: "reports.view" },
  { prefix: "/api/audit", permission: "audit.view" },
];

export function hasPermission(role: AppRole, permission: Permission) {
  if (!PERMISSIONS[permission]) return false;
  return (PERMISSIONS[permission] as readonly string[]).includes(role);
}

export function routePermission(pathname: string): Permission | null {
  const matched = PATH_PERMISSIONS.find((item) => pathname.startsWith(item.prefix));
  return matched?.permission ?? null;
}

export function apiPermission(pathname: string): Permission | null {
  const matched = API_PERMISSIONS.find((item) => pathname.startsWith(item.prefix));
  return matched?.permission ?? null;
}
