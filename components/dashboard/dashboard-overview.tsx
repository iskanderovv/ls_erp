"use client";

import { useQuery } from "@tanstack/react-query";

import { AnalyticsCharts } from "@/components/dashboard/analytics-charts";
import { SmartInsights } from "@/components/dashboard/smart-insights";
import { SmartOperations } from "@/components/dashboard/smart-operations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrencyFromCents } from "@/lib/money";
import { queryKeys } from "@/lib/query-keys";
import { formatDate } from "@/lib/utils";

type DashboardSummary = {
  totals: {
    students: number;
    activeGroups: number;
    teachers: number;
    leads: number;
  };
  finance: {
    todayRevenueCents: number;
    monthRevenueCents: number;
    outstandingDebtCents: number;
  } | null;
  recentStudents: Array<{
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    createdAt: string;
  }>;
  recentLeads: Array<{
    id: string;
    firstName: string;
    lastName: string | null;
    phone: string;
    createdAt: string;
  }>;
};

async function fetchDashboardSummary() {
  const response = await fetch("/api/dashboard/summary", {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Dashboard ma'lumotlarini olishda xatolik.");
  }
  return (await response.json()) as DashboardSummary;
}

export function DashboardOverview() {
  const query = useQuery({
    queryKey: queryKeys.dashboard.summary,
    queryFn: fetchDashboardSummary,
  });

  if (query.isLoading) {
    return <div className="text-sm text-slate-500">Yuklanmoqda...</div>;
  }

  if (query.isError || !query.data) {
    return <EmptyState message="Dashboard ma'lumotlarini yuklab bo'lmadi." />;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Jami talabalar" value={query.data.totals.students} />
        <StatCard label="Faol guruhlar" value={query.data.totals.activeGroups} />
        <StatCard label="Jami ustozlar" value={query.data.totals.teachers} />
        <StatCard label="Jami lidlar" value={query.data.totals.leads} />
      </div>

      {query.data.finance ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <FinanceCard
            label="Bugungi tushum"
            value={`${formatCurrencyFromCents(query.data.finance.todayRevenueCents)} so'm`}
          />
          <FinanceCard
            label="Oylik tushum"
            value={`${formatCurrencyFromCents(query.data.finance.monthRevenueCents)} so'm`}
          />
          <FinanceCard
            label="Jami qarzdorlik"
            value={`${formatCurrencyFromCents(query.data.finance.outstandingDebtCents)} so'm`}
            danger
          />
        </div>
      ) : null}

      <AnalyticsCharts />

      <SmartInsights />

      <SmartOperations />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Yaqinda qo'shilgan talabalar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {query.data.recentStudents.length === 0 ? (
              <p className="text-sm text-slate-500">Hozircha ma'lumot yo'q.</p>
            ) : (
              query.data.recentStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between rounded-md border border-slate-100 p-3"
                >
                  <div>
                    <p className="font-medium">
                      {student.firstName} {student.lastName}
                    </p>
                    <p className="text-xs text-slate-500">{student.phone}</p>
                  </div>
                  <p className="text-xs text-slate-500">{formatDate(student.createdAt)}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Yaqinda qo'shilgan lidlar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {query.data.recentLeads.length === 0 ? (
              <p className="text-sm text-slate-500">Hozircha ma'lumot yo'q.</p>
            ) : (
              query.data.recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between rounded-md border border-slate-100 p-3"
                >
                  <div>
                    <p className="font-medium">
                      {lead.firstName} {lead.lastName ?? ""}
                    </p>
                    <p className="text-xs text-slate-500">{lead.phone}</p>
                  </div>
                  <p className="text-xs text-slate-500">{formatDate(lead.createdAt)}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <p className="text-sm text-slate-500">{label}</p>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function FinanceCard({
  label,
  value,
  danger,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <p className="text-sm text-slate-500">{label}</p>
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-bold ${danger ? "text-red-600" : ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
