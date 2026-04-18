"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { queryKeys } from "@/lib/query-keys";
import { formatCurrencyFromCents } from "@/lib/money";

type SmartResponse = {
  reminders: {
    overdueStudents: number | null;
    absentToday: number;
    followUpLeads: number;
    inactiveStudents: number;
  };
  leadConversionRate: number;
  predictions: {
    likelyDropouts: Array<{
      studentId: string;
      studentName: string;
      score: number;
      debtCents: number;
    }>;
  };
  alerts: Array<{
    id: string;
    severity: "INFO" | "WARNING" | "CRITICAL";
    title: string;
    message: string;
    link: string;
  }>;
  myTasks: {
    openCount: number;
    dueToday: number;
    rows: Array<{
      id: string;
      title: string;
      dueDate: string | null;
      status: string;
    }>;
  };
  overduePreview: Array<{
    studentId: string;
    studentName: string;
    groupName: string;
    debtCents: number;
  }>;
};

async function fetchSmart() {
  const response = await fetch("/api/dashboard/smart", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Smart ma'lumotlarni olishda xatolik.");
  }
  return (await response.json()) as SmartResponse;
}

export function SmartOperations() {
  const query = useQuery({
    queryKey: queryKeys.dashboard.smart,
    queryFn: fetchSmart,
  });

  if (query.isLoading || !query.data) {
    return <p className="text-sm text-slate-500">Smart widgetlar yuklanmoqda...</p>;
  }

  const data = query.data;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MiniCard label="Follow-up lidlar" value={String(data.reminders.followUpLeads)} />
        <MiniCard label="Bugungi absentlar" value={String(data.reminders.absentToday)} />
        <MiniCard label="Noaktiv talabalar" value={String(data.reminders.inactiveStudents)} />
        <MiniCard label="Lead konversiya" value={`${data.leadConversionRate}%`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Kritik ogohlantirishlar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.alerts.length === 0 ? (
              <p className="text-sm text-slate-500">Hozircha kritik ogohlantirish yo'q.</p>
            ) : (
              data.alerts.map((alert) => (
                <Link
                  key={alert.id}
                  href={alert.link}
                  className={`block rounded-md border p-3 text-sm ${
                    alert.severity === "CRITICAL"
                      ? "border-red-200 bg-red-50"
                      : alert.severity === "WARNING"
                        ? "border-amber-200 bg-amber-50"
                        : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <p className="font-medium">{alert.title}</p>
                  <p className="text-xs text-slate-600">{alert.message}</p>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mening vazifalarim</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              Ochiq vazifalar: <span className="font-semibold">{data.myTasks.openCount}</span>
            </p>
            <p>
              Bugun due: <span className="font-semibold">{data.myTasks.dueToday}</span>
            </p>
            <Link href="/dashboard/tasks" className="text-xs text-blue-700 hover:underline">
              Vazifalar bo'limini ochish
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Likely drop talabalar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.predictions.likelyDropouts.length === 0 ? (
              <p className="text-slate-500">Topilmadi.</p>
            ) : (
              data.predictions.likelyDropouts.map((row) => (
                <div key={row.studentId} className="rounded-md border border-slate-100 p-2">
                  <p className="font-medium">{row.studentName}</p>
                  <p className="text-xs text-slate-500">
                    Risk: {row.score}% • Qarzdorlik: {formatCurrencyFromCents(row.debtCents)} so'm
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Overdue preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.overduePreview.length === 0 ? (
              <p className="text-slate-500">Qarzdorlik topilmadi.</p>
            ) : (
              data.overduePreview.map((row) => (
                <div key={row.studentId + row.groupName} className="rounded-md border border-slate-100 p-2">
                  <p className="font-medium">{row.studentName}</p>
                  <p className="text-xs text-slate-500">
                    {row.groupName} • {formatCurrencyFromCents(row.debtCents)} so'm
                  </p>
                </div>
              ))
            )}
            <Link href="/dashboard/debts" className="text-xs text-blue-700 hover:underline">
              Barcha qarzlarni ko'rish
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MiniCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <p className="text-xs text-slate-500">{label}</p>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
