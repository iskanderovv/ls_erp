import Link from "next/link";
import { ExpenseCategory } from "@prisma/client";

import { ExpenseForm } from "@/components/forms/expense-form";
import { VoidExpenseButton } from "@/components/finance/void-expense-button";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableCell, TableHead } from "@/components/ui/table";
import { hasPermission } from "@/lib/auth/permissions";
import { requirePagePermission } from "@/lib/auth/session";
import { expenseCategoryLabels, expenseStatusLabels } from "@/lib/constants";
import { formatCurrencyFromCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { searchValue } from "@/lib/search-params";
import { formatDate } from "@/lib/utils";

type SearchParams = Promise<{
  branchId?: string;
  category?: string;
  from?: string;
  to?: string;
}>;

export default async function ExpensesPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requirePagePermission("expenses.view");
  const canManage = hasPermission(session.role, "expenses.manage");
  const isGlobalRole = session.role === "SUPER_ADMIN" || session.role === "ADMIN";
  const scopedBranchId = session.branchId ?? "__none__";

  const params = await searchParams;
  const selectedBranchId = searchValue(params.branchId);
  const selectedCategory = searchValue(params.category);
  const from = searchValue(params.from);
  const to = searchValue(params.to);
  const branchId = isGlobalRole ? selectedBranchId || null : scopedBranchId;
  const category = selectedCategory
    ? ExpenseCategory[selectedCategory as keyof typeof ExpenseCategory] ?? null
    : null;

  const [branches, expenses] = await Promise.all([
    prisma.branch.findMany({
      where: isGlobalRole ? undefined : { id: scopedBranchId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.expense.findMany({
      where: {
        ...(branchId ? { branchId } : {}),
        ...(category ? { category } : {}),
        ...(from || to
          ? {
              paidAt: {
                ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
                ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
              },
            }
          : {}),
      },
      include: {
        branch: { select: { name: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
      take: 500,
    }),
  ]);

  const activeTotal = expenses
    .filter((expense) => expense.status === "ACTIVE")
    .reduce((sum, expense) => sum + expense.amountCents, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Xarajatlar"
        description="Markaz chiqimlarini kiritish, filtrlash va nazorat qilish"
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
        <Select name="category" defaultValue={selectedCategory}>
          <option value="">Barcha kategoriyalar</option>
          <option value="RENT">Ijara</option>
          <option value="SALARY">Oylik</option>
          <option value="MARKETING">Marketing</option>
          <option value="UTILITIES">Kommunal</option>
          <option value="EQUIPMENT">Jihoz</option>
          <option value="OTHER">Boshqa</option>
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
        <p className="text-sm text-slate-500">Faol xarajatlar yig'indisi</p>
        <p className="text-2xl font-bold">{formatCurrencyFromCents(activeTotal)} so'm</p>
      </div>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Yangi xarajat qo'shish</CardTitle>
          </CardHeader>
          <CardContent>
            <ExpenseForm branches={branches} />
          </CardContent>
        </Card>
      ) : null}

      {expenses.length === 0 ? (
        <EmptyState message="Xarajatlar topilmadi." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <Table>
            <thead>
              <tr>
                <TableHead>Nomi</TableHead>
                <TableHead>Filial</TableHead>
                <TableHead>Kategoriya</TableHead>
                <TableHead>Holat</TableHead>
                <TableHead>Summa</TableHead>
                <TableHead>Sana</TableHead>
                <TableHead>Kiritgan</TableHead>
                <TableHead className="w-[220px]">Amallar</TableHead>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{expense.title}</p>
                      {expense.note ? <p className="text-xs text-slate-500">{expense.note}</p> : null}
                    </div>
                  </TableCell>
                  <TableCell>{expense.branch.name}</TableCell>
                  <TableCell>{expenseCategoryLabels[expense.category]}</TableCell>
                  <TableCell>{expenseStatusLabels[expense.status]}</TableCell>
                  <TableCell className="font-medium">
                    {formatCurrencyFromCents(expense.amountCents)} so'm
                  </TableCell>
                  <TableCell>{formatDate(expense.paidAt)}</TableCell>
                  <TableCell>
                    {expense.createdBy.firstName} {expense.createdBy.lastName}
                  </TableCell>
                  <TableCell>
                    {canManage ? (
                      <div className="flex items-start gap-3">
                        <Link
                          className="pt-2 text-sm text-slate-700 hover:underline"
                          href={`/dashboard/expenses/${expense.id}/edit`}
                        >
                          Tahrirlash
                        </Link>
                        {expense.status === "ACTIVE" ? (
                          <VoidExpenseButton expenseId={expense.id} />
                        ) : (
                          <p className="pt-2 text-xs text-slate-500">Bekor qilingan</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">Faqat ko'rish</p>
                    )}
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
