"use client";

import { useQuery } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { expenseCategoryLabels, paymentMethodLabels } from "@/lib/constants";
import { formatCurrencyFromCents } from "@/lib/money";
import { queryKeys } from "@/lib/query-keys";

type FinanceSummary = {
  todayRevenueCents: number;
  monthRevenueCents: number;
  monthExpenseCents: number;
  monthSalaryCents: number;
  monthProfitCents: number;
  outstandingDebtCents: number;
  paymentMethodTotals: Record<"CASH" | "CARD" | "CLICK" | "PAYME" | "OTHER", number>;
  expenseCategoryTotals: Record<
    "RENT" | "SALARY" | "MARKETING" | "UTILITIES" | "EQUIPMENT" | "OTHER",
    number
  >;
  insights: {
    highestExpenseCategory: {
      category: string;
      amountCents: number;
    };
  };
  topPayingGroups: Array<{
    groupId: string | null;
    groupName: string;
    amountCents: number;
  }>;
};

async function fetchFinanceSummary() {
  const response = await fetch("/api/dashboard/finance-summary", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Moliya ko'rsatkichlarini olishda xatolik.");
  }
  return (await response.json()) as FinanceSummary;
}

export function FinanceSummaryCards() {
  const query = useQuery({
    queryKey: queryKeys.dashboard.financeSummary,
    queryFn: fetchFinanceSummary,
  });

  if (query.isLoading) {
    return <p className="text-sm text-slate-500">Yuklanmoqda...</p>;
  }
  if (query.isError || !query.data) {
    return <EmptyState message="Moliya ma'lumotlarini yuklab bo'lmadi." />;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Bugungi tushum" cents={query.data.todayRevenueCents} />
        <MetricCard label="Oylik tushum" cents={query.data.monthRevenueCents} />
        <MetricCard label="Jami qarzdorlik" cents={query.data.outstandingDebtCents} danger />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Oylik xarajatlar" cents={query.data.monthExpenseCents} />
        <MetricCard label="Oylik oylik to'lovlari" cents={query.data.monthSalaryCents} />
        <MetricCard
          label="Sof foyda"
          cents={query.data.monthProfitCents}
          danger={query.data.monthProfitCents < 0}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>To'lov usullari bo'yicha</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(Object.keys(query.data.paymentMethodTotals) as Array<keyof FinanceSummary["paymentMethodTotals"]>).map(
              (key) => (
                <div key={key} className="flex items-center justify-between rounded-md border border-slate-100 p-2">
                  <span>{paymentMethodLabels[key]}</span>
                  <span className="font-medium">
                    {formatCurrencyFromCents(query.data.paymentMethodTotals[key])} so'm
                  </span>
                </div>
              ),
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Eng ko'p to'lov tushgan guruhlar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {query.data.topPayingGroups.length === 0 ? (
              <p className="text-slate-500">Ma'lumot topilmadi.</p>
            ) : (
              query.data.topPayingGroups.map((group) => (
                <div key={`${group.groupId ?? "none"}-${group.amountCents}`} className="flex items-center justify-between rounded-md border border-slate-100 p-2">
                  <span>{group.groupName}</span>
                  <span className="font-medium">{formatCurrencyFromCents(group.amountCents)} so'm</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Xarajat kategoriyalari</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(
              Object.keys(query.data.expenseCategoryTotals) as Array<
                keyof FinanceSummary["expenseCategoryTotals"]
              >
            ).map((key) => (
              <div
                key={key}
                className="flex items-center justify-between rounded-md border border-slate-100 p-2"
              >
                <span>{expenseCategoryLabels[key]}</span>
                <span className="font-medium">
                  {formatCurrencyFromCents(query.data.expenseCategoryTotals[key])} so'm
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Smart insight</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="rounded-md border border-slate-100 p-3">
              <p className="text-xs text-slate-500">Eng katta xarajat kategoriyasi</p>
              <p className="font-medium">
                {expenseCategoryLabels[
                  query.data.insights.highestExpenseCategory
                    .category as keyof typeof expenseCategoryLabels
                ] ?? query.data.insights.highestExpenseCategory.category}
              </p>
              <p className="text-xs text-slate-500">
                {formatCurrencyFromCents(query.data.insights.highestExpenseCategory.amountCents)}{" "}
                so'm
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ label, cents, danger }: { label: string; cents: number; danger?: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <p className="text-sm text-slate-500">{label}</p>
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-bold ${danger ? "text-red-600" : ""}`}>
          {formatCurrencyFromCents(cents)} so'm
        </p>
      </CardContent>
    </Card>
  );
}
