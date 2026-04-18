import { SalaryRecordStatus } from "@prisma/client";

import { SalaryConfigForm } from "@/components/forms/salary-config-form";
import { CalculateSalaryButton } from "@/components/finance/calculate-salary-button";
import { SalaryRecordActions } from "@/components/finance/salary-record-actions";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableCell, TableHead } from "@/components/ui/table";
import { hasPermission } from "@/lib/auth/permissions";
import { requirePagePermission } from "@/lib/auth/session";
import { salaryStatusLabels, salaryTypeLabels } from "@/lib/constants";
import { formatCurrencyFromCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { searchValue } from "@/lib/search-params";
import { formatDate } from "@/lib/utils";

type SearchParams = Promise<{
  branchId?: string;
  teacherId?: string;
  periodMonth?: string;
  periodYear?: string;
}>;

export default async function SalariesPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requirePagePermission("salary.view");
  const canManage = hasPermission(session.role, "salary.manage");
  const isGlobalRole = session.role === "SUPER_ADMIN" || session.role === "ADMIN";
  const scopedBranchId = session.branchId ?? "__none__";

  const params = await searchParams;
  const selectedBranchId = searchValue(params.branchId);
  const selectedTeacherId = searchValue(params.teacherId);
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

  const [branches, teachers, records] = await Promise.all([
    prisma.branch.findMany({
      where: isGlobalRole ? undefined : { id: scopedBranchId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.teacher.findMany({
      where: branchId ? { branchId } : undefined,
      select: { id: true, firstName: true, lastName: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
    prisma.salaryRecord.findMany({
      where: {
        ...(branchId ? { branchId } : {}),
        ...(selectedTeacherId ? { teacherId: selectedTeacherId } : {}),
        periodMonth,
        periodYear,
      },
      include: {
        teacher: {
          select: { firstName: true, lastName: true },
        },
        branch: {
          select: { name: true },
        },
        payments: {
          select: { id: true, amountCents: true, paidAt: true },
          orderBy: { paidAt: "desc" },
        },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 300,
    }),
  ]);

  const teacherIds = teachers.map((teacher) => teacher.id);
  const activeConfigs = teacherIds.length
    ? await prisma.teacherSalaryConfig.findMany({
        where: {
          isActive: true,
          teacherId: { in: teacherIds },
        },
        include: {
          teacher: {
            select: { firstName: true, lastName: true },
          },
        },
        orderBy: [{ createdAt: "desc" }],
        take: 100,
      })
    : [];

  const teacherOptions = teachers.map((teacher) => ({
    id: teacher.id,
    fullName: `${teacher.firstName} ${teacher.lastName}`,
  }));

  const totals = records.reduce(
    (acc, row) => {
      acc.calculated += row.calculatedAmountCents;
      acc.paid += row.paidAmountCents;
      return acc;
    },
    { calculated: 0, paid: 0 },
  );
  const remaining = totals.calculated - totals.paid;
  const statusCounters: Record<SalaryRecordStatus, number> = records.reduce(
    (acc, row) => {
      acc[row.status] += 1;
      return acc;
    },
    {
      PENDING: 0,
      PARTIAL: 0,
      PAID: 0,
    },
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ustoz oyliklari"
        description="Oylik modellarini sozlash, oylik hisoblash va to'lovlarni yuritish"
      />

      <form className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-5">
        <Select name="branchId" defaultValue={selectedBranchId} disabled={!isGlobalRole}>
          <option value="">Barcha filiallar</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </Select>
        <Select name="teacherId" defaultValue={selectedTeacherId}>
          <option value="">Barcha ustozlar</option>
          {teacherOptions.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.fullName}
            </option>
          ))}
        </Select>
        <Input type="number" name="periodMonth" min={1} max={12} defaultValue={String(periodMonth)} />
        <Input type="number" name="periodYear" min={2020} max={2200} defaultValue={String(periodYear)} />
        <button
          type="submit"
          className="h-10 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
        >
          Filtrlash
        </button>
      </form>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Hisoblangan oylik" value={`${formatCurrencyFromCents(totals.calculated)} so'm`} />
        <StatCard label="To'langan summa" value={`${formatCurrencyFromCents(totals.paid)} so'm`} />
        <StatCard label="Qolgan to'lov" value={`${formatCurrencyFromCents(Math.max(remaining, 0))} so'm`} danger />
        <StatCard
          label="Statuslar"
          value={`Kutilmoqda ${statusCounters.PENDING} • Qisman ${statusCounters.PARTIAL} • To'langan ${statusCounters.PAID}`}
        />
      </div>

      {canManage ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <SalaryConfigForm teachers={teacherOptions} />
          <Card>
            <CardHeader>
              <CardTitle>Hisoblash paneli</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {teacherOptions.length === 0 ? (
                <p className="text-sm text-slate-500">Ustozlar topilmadi.</p>
              ) : (
                teacherOptions.map((teacher) => (
                  <div
                    key={teacher.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-100 p-2"
                  >
                    <p className="text-sm font-medium">{teacher.fullName}</p>
                    <CalculateSalaryButton
                      teacherId={teacher.id}
                      periodMonth={periodMonth}
                      periodYear={periodYear}
                    />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Faol oylik modellar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {activeConfigs.length === 0 ? (
            <p className="text-slate-500">Faol oylik modeli topilmadi.</p>
          ) : (
            activeConfigs.map((config) => (
              <div key={config.id} className="rounded-md border border-slate-100 p-2">
                <p className="font-medium">
                  {config.teacher.firstName} {config.teacher.lastName}
                </p>
                <p className="text-xs text-slate-500">
                  {salaryTypeLabels[config.type]} •{" "}
                  {config.type === "PERCENTAGE"
                    ? `${((config.percentageBps ?? 0) / 100).toFixed(2)}%`
                    : `${formatCurrencyFromCents(config.unitAmountCents ?? 0)} so'm`}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {records.length === 0 ? (
        <EmptyState message="Tanlangan davr uchun oylik yozuvlari topilmadi." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <Table>
            <thead>
              <tr>
                <TableHead>Ustoz</TableHead>
                <TableHead>Filial</TableHead>
                <TableHead>Davr</TableHead>
                <TableHead>Hisoblangan</TableHead>
                <TableHead>To'langan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>To'lovlar</TableHead>
                <TableHead className="w-[280px]">Amallar</TableHead>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => {
                const recordRemaining = Math.max(0, record.calculatedAmountCents - record.paidAmountCents);
                return (
                  <tr key={record.id}>
                    <TableCell>
                      {record.teacher.firstName} {record.teacher.lastName}
                    </TableCell>
                    <TableCell>{record.branch.name}</TableCell>
                    <TableCell>
                      {String(record.periodMonth).padStart(2, "0")}.{record.periodYear}
                    </TableCell>
                    <TableCell>{formatCurrencyFromCents(record.calculatedAmountCents)} so'm</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{formatCurrencyFromCents(record.paidAmountCents)} so'm</p>
                        <p className="text-xs text-red-600">
                          Qolgan: {formatCurrencyFromCents(recordRemaining)} so'm
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{salaryStatusLabels[record.status]}</TableCell>
                    <TableCell>
                      <div className="space-y-1 text-xs text-slate-500">
                        <p>{record.payments.length} ta to'lov</p>
                        {record.payments[0] ? <p>Oxirgi: {formatDate(record.payments[0].paidAt)}</p> : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <SalaryRecordActions
                        recordId={record.id}
                        canManage={canManage && recordRemaining > 0}
                      />
                    </TableCell>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`text-lg font-bold ${danger ? "text-red-600" : ""}`}>{value}</p>
    </div>
  );
}
