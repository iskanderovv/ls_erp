export const queryKeys = {
  dashboard: {
    summary: ["dashboard-summary"] as const,
    financeSummary: ["dashboard-finance-summary"] as const,
    smart: ["dashboard-smart"] as const,
  },
  notifications: {
    list: ["notifications-list"] as const,
  },
  tasks: {
    list: ["tasks-list"] as const,
  },
  attendance: {
    board: (groupId: string, date: string) => ["attendance-board", groupId, date] as const,
  },
  finance: {
    ledger: ["finance-ledger"] as const,
    expenses: ["finance-expenses"] as const,
    salaries: ["finance-salaries"] as const,
    reports: (periodYear: number, periodMonth: number) =>
      ["finance-reports", periodYear, periodMonth] as const,
  },
};
