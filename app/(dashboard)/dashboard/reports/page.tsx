import { ExpenseCategory } from "@prisma/client";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableCell, TableHead } from "@/components/ui/table";
import { endOfMonth, startOfMonth } from "@/lib/date";
import { expenseCategoryLabels } from "@/lib/constants";
import { formatCurrencyFromCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { requirePagePermission } from "@/lib/auth/session";
import { searchValue } from "@/lib/search-params";

type SearchParams = Promise<{
  branchId?: string;
  periodMonth?: string;
  periodYear?: string;
}>;

export default async function ReportsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requirePagePermission("reports.view");
  const isGlobalRole = session.role === "SUPER_ADMIN" || session.role === "ADMIN";
  const scopedBranchId = session.branchId ?? "__none__";

  const params = await searchParams;
  const selectedBranchId = searchValue(params.branchId);
  const periodMonthParam = Number(searchValue(params.periodMonth));
  const periodYearParam = Number(searchValue(params.periodYear));

  const now = new Date();
  const periodMonth = Number.isInteger(periodMonthParam) && periodMonthParam >= 1 && periodMonthParam <= 12
    ? periodMonthParam
    : now.getUTCMonth() + 1;
  const periodYear = Number.isInteger(periodYearParam) && periodYearParam >= 2020 && periodYearParam <= 2200
    ? periodYearParam
    : now.getUTCFullYear();
  const branchId = isGlobalRole ? selectedBranchId || null : scopedBranchId;

  const periodStart = startOfMonth(new Date(Date.UTC(periodYear, periodMonth - 1, 1)));
  const periodEnd = endOfMonth(periodStart);

  const [branches, revenueAgg, expenseAgg, salaryAgg, expenseByCategory, groupRevenueRows, salaryByTeacher] =
    await Promise.all([
      prisma.branch.findMany({
        where: isGlobalRole ? undefined : { id: scopedBranchId },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.payment.aggregate({
        where: {
          ...(branchId ? { branchId } : {}),
          paidAt: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
        _sum: { amountCents: true },
      }),
      prisma.expense.aggregate({
        where: {
          ...(branchId ? { branchId } : {}),
          status: "ACTIVE",
          paidAt: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
        _sum: { amountCents: true },
      }),
      prisma.salaryPayment.aggregate({
        where: {
          ...(branchId ? { branchId } : {}),
          paidAt: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
        _sum: { amountCents: true },
      }),
      prisma.expense.groupBy({
        by: ["category"],
        where: {
          ...(branchId ? { branchId } : {}),
          status: "ACTIVE",
          paidAt: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
        _sum: { amountCents: true },
      }),
      prisma.payment.groupBy({
        by: ["groupId"],
        where: {
          ...(branchId ? { branchId } : {}),
          groupId: { not: null },
          paidAt: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
        _sum: { amountCents: true },
        orderBy: { _sum: { amountCents: "desc" } },
      }),
      prisma.salaryPayment.groupBy({
        by: ["teacherId"],
        where: {
          ...(branchId ? { branchId } : {}),
          paidAt: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
        _sum: { amountCents: true },
      }),
    ]);

  const revenueCents = revenueAgg._sum.amountCents ?? 0;
  const expenseCents = expenseAgg._sum.amountCents ?? 0;
  const salaryCents = salaryAgg._sum.amountCents ?? 0;
  const netProfitCents = revenueCents - expenseCents - salaryCents;

  const expenseByCategoryTotals: Record<ExpenseCategory, number> = {
    RENT: 0,
    SALARY: 0,
    MARKETING: 0,
    UTILITIES: 0,
    EQUIPMENT: 0,
    OTHER: 0,
  };
  for (const row of expenseByCategory) {
    expenseByCategoryTotals[row.category] = row._sum.amountCents ?? 0;
  }

  const highestExpenseCategory = Object.entries(expenseByCategoryTotals).sort((a, b) => b[1] - a[1])[0] ?? [
    "OTHER",
    0,
  ];

  const groupIds = groupRevenueRows
    .map((row) => row.groupId)
    .filter((value): value is string => Boolean(value));
  const groups = await prisma.studyGroup.findMany({
    where: { id: { in: groupIds } },
    select: { id: true, name: true, teacherId: true },
  });
  const groupMap = new Map(groups.map((group) => [group.id, group]));

  const topGroups = groupRevenueRows.slice(0, 5).map((row) => ({
    groupId: row.groupId,
    groupName: row.groupId ? groupMap.get(row.groupId)?.name ?? "Noma'lum" : "Noma'lum",
    revenueCents: row._sum.amountCents ?? 0,
  }));

  const teacherRevenueMap = new Map<string, number>();
  for (const row of groupRevenueRows) {
    if (!row.groupId) continue;
    const group = groupMap.get(row.groupId);
    if (!group?.teacherId) continue;
    teacherRevenueMap.set(
      group.teacherId,
      (teacherRevenueMap.get(group.teacherId) ?? 0) + (row._sum.amountCents ?? 0),
    );
  }

  const teacherIds = salaryByTeacher.map((row) => row.teacherId);
  const teachers = await prisma.teacher.findMany({
    where: { id: { in: teacherIds } },
    select: { id: true, firstName: true, lastName: true },
  });
  const teacherMap = new Map(teachers.map((teacher) => [teacher.id, teacher]));
  const teacherCostVsRevenue = salaryByTeacher.map((row) => {
    const teacher = teacherMap.get(row.teacherId);
    const salaryCostCents = row._sum.amountCents ?? 0;
    const revenue = teacherRevenueMap.get(row.teacherId) ?? 0;
    return {
      teacherId: row.teacherId,
      teacherName: teacher ? `${teacher.firstName} ${teacher.lastName}` : "Noma'lum ustoz",
      salaryCostCents,
      revenueCents: revenue,
      marginCents: revenue - salaryCostCents,
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Moliyaviy hisobotlar" description="Oylik P&L va smart insight'lar" />

      <form className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-4">
        <Select name="branchId" defaultValue={selectedBranchId} disabled={!isGlobalRole}>
          <option value="">Barcha filiallar</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </Select>
        <Input type="number" name="periodMonth" min={1} max={12} defaultValue={String(periodMonth)} />
        <Input type="number" name="periodYear" min={2020} max={2200} defaultValue={String(periodYear)} />
        <button
          type="submit"
          className="h-10 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
        >
          Hisobotni yangilash
        </button>
      </form>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Tushum" cents={revenueCents} />
        <MetricCard label="Xarajatlar" cents={expenseCents} />
        <MetricCard label="Oylik to'lovlari" cents={salaryCents} />
        <MetricCard label="Sof foyda" cents={netProfitCents} danger={netProfitCents < 0} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Kategoriya bo'yicha xarajatlar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(Object.keys(expenseByCategoryTotals) as Array<keyof typeof expenseByCategoryTotals>).map(
              (key) => (
                <div key={key} className="flex items-center justify-between rounded-md border border-slate-100 p-2">
                  <span>{expenseCategoryLabels[key]}</span>
                  <span className="font-medium">
                    {formatCurrencyFromCents(expenseByCategoryTotals[key])} so'm
                  </span>
                </div>
              ),
            )}
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
                {expenseCategoryLabels[highestExpenseCategory[0] as keyof typeof expenseCategoryLabels]}
              </p>
              <p className="text-xs text-slate-500">
                {formatCurrencyFromCents(highestExpenseCategory[1])} so'm
              </p>
            </div>
            <div className="rounded-md border border-slate-100 p-3">
              <p className="text-xs text-slate-500">Eng ko'p tushum bergan guruh</p>
              <p className="font-medium">{topGroups[0]?.groupName ?? "Topilmadi"}</p>
              <p className="text-xs text-slate-500">
                {formatCurrencyFromCents(topGroups[0]?.revenueCents ?? 0)} so'm
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top guruhlar</CardTitle>
          </CardHeader>
          <CardContent>
            {topGroups.length === 0 ? (
              <p className="text-sm text-slate-500">Ma'lumot yo'q.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <thead>
                    <tr>
                      <TableHead>Guruh</TableHead>
                      <TableHead>Tushum</TableHead>
                    </tr>
                  </thead>
                  <tbody>
                    {topGroups.map((group) => (
                      <tr key={group.groupId ?? group.groupName}>
                        <TableCell>{group.groupName}</TableCell>
                        <TableCell>{formatCurrencyFromCents(group.revenueCents)} so'm</TableCell>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Teacher cost vs revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {teacherCostVsRevenue.length === 0 ? (
              <p className="text-sm text-slate-500">Ma'lumot yo'q.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <thead>
                    <tr>
                      <TableHead>Ustoz</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Salary</TableHead>
                      <TableHead>Margin</TableHead>
                    </tr>
                  </thead>
                  <tbody>
                    {teacherCostVsRevenue.map((row) => (
                      <tr key={row.teacherId}>
                        <TableCell>{row.teacherName}</TableCell>
                        <TableCell>{formatCurrencyFromCents(row.revenueCents)} so'm</TableCell>
                        <TableCell>{formatCurrencyFromCents(row.salaryCostCents)} so'm</TableCell>
                        <TableCell className={row.marginCents < 0 ? "text-red-600 font-semibold" : "font-medium"}>
                          {formatCurrencyFromCents(row.marginCents)} so'm
                        </TableCell>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ label, cents, danger }: { label: string; cents: number; danger?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`text-2xl font-bold ${danger ? "text-red-600" : ""}`}>
        {formatCurrencyFromCents(cents)} so'm
      </p>
    </div>
  );
}
