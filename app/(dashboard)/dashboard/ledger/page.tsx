import { FinancialTransactionType } from "@prisma/client";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableCell, TableHead } from "@/components/ui/table";
import { requirePagePermission } from "@/lib/auth/session";
import { transactionTypeLabels } from "@/lib/constants";
import { formatCurrencyFromCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { searchValue } from "@/lib/search-params";
import { formatDate } from "@/lib/utils";

type SearchParams = Promise<{
  branchId?: string;
  type?: string;
  from?: string;
  to?: string;
}>;

export default async function LedgerPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requirePagePermission("ledger.view");
  const isGlobalRole = session.role === "SUPER_ADMIN" || session.role === "ADMIN";
  const scopedBranchId = session.branchId ?? "__none__";

  const params = await searchParams;
  const selectedBranchId = searchValue(params.branchId);
  const selectedType = searchValue(params.type);
  const from = searchValue(params.from);
  const to = searchValue(params.to);

  const branchId = isGlobalRole ? selectedBranchId || null : scopedBranchId;
  const type = selectedType
    ? FinancialTransactionType[selectedType as keyof typeof FinancialTransactionType] ?? null
    : null;

  const [branches, rows] = await Promise.all([
    prisma.branch.findMany({
      where: isGlobalRole ? undefined : { id: scopedBranchId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.financialTransaction.findMany({
      where: {
        ...(branchId ? { branchId } : {}),
        ...(type ? { type } : {}),
        ...(from || to
          ? {
              occurredAt: {
                ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
                ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
              },
            }
          : {}),
      },
      include: {
        branch: { select: { name: true } },
        createdBy: { select: { firstName: true, lastName: true } },
        payment: {
          select: {
            id: true,
            student: {
              select: { firstName: true, lastName: true },
            },
          },
        },
        expense: {
          select: { id: true, title: true, status: true },
        },
        salaryPayment: {
          select: {
            id: true,
            teacher: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
      take: 600,
    }),
  ]);

  const totalCents = rows.reduce((sum, row) => sum + row.amountCents, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Moliyaviy ledger"
        description="Barcha kirim/chiqim/salary tranzaksiyalarining yagona jurnali"
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
        <Select name="type" defaultValue={selectedType}>
          <option value="">Barcha turlar</option>
          <option value="INCOME">Kirim</option>
          <option value="EXPENSE">Chiqim</option>
          <option value="SALARY">Oylik</option>
        </Select>
        <Input type="date" name="from" defaultValue={from} />
        <Input type="date" name="to" defaultValue={to} />
        <button
          type="submit"
          className="h-10 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
        >
          Filtrlash
        </button>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm text-slate-500">Tanlangan davr bo'yicha umumiy hajm</p>
        <p className="text-2xl font-bold">{formatCurrencyFromCents(totalCents)} so'm</p>
      </div>

      {rows.length === 0 ? (
        <EmptyState message="Tranzaksiyalar topilmadi." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <Table>
            <thead>
              <tr>
                <TableHead>Sana</TableHead>
                <TableHead>Turi</TableHead>
                <TableHead>Filial</TableHead>
                <TableHead>Manba</TableHead>
                <TableHead>Summa</TableHead>
                <TableHead>Izoh</TableHead>
                <TableHead>Kiritgan</TableHead>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <TableCell>{formatDate(row.occurredAt)}</TableCell>
                  <TableCell>{transactionTypeLabels[row.type]}</TableCell>
                  <TableCell>{row.branch.name}</TableCell>
                  <TableCell>{resolveReference(row)}</TableCell>
                  <TableCell className="font-medium">{formatCurrencyFromCents(row.amountCents)} so'm</TableCell>
                  <TableCell>{row.note ?? "-"}</TableCell>
                  <TableCell>
                    {row.createdBy.firstName} {row.createdBy.lastName}
                  </TableCell>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </div>
  );
}

function resolveReference(
  row: {
    type: FinancialTransactionType;
    payment: { id: string; student: { firstName: string; lastName: string } } | null;
    expense: { id: string; title: string; status: "ACTIVE" | "VOID" } | null;
    salaryPayment: { id: string; teacher: { firstName: string; lastName: string } } | null;
  },
) {
  if (row.type === "INCOME" && row.payment) {
    return `To'lov • ${row.payment.student.firstName} ${row.payment.student.lastName}`;
  }
  if (row.type === "EXPENSE" && row.expense) {
    return `${row.expense.title}${row.expense.status === "VOID" ? " (bekor qilingan)" : ""}`;
  }
  if (row.type === "SALARY" && row.salaryPayment) {
    return `Oylik • ${row.salaryPayment.teacher.firstName} ${row.salaryPayment.teacher.lastName}`;
  }
  return "-";
}
