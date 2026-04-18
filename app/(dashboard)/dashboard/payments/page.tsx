import { PaymentMethod, StudentFeeStatus } from "@prisma/client";

import { PaymentForm } from "@/components/forms/payment-form";
import { StudentFeeForm } from "@/components/forms/student-fee-form";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableCell, TableHead } from "@/components/ui/table";
import { hasPermission } from "@/lib/auth/permissions";
import { requirePagePermission } from "@/lib/auth/session";
import { paymentMethodLabels } from "@/lib/constants";
import { formatCurrencyFromCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { searchValue } from "@/lib/search-params";
import { formatDate } from "@/lib/utils";

type SearchParams = Promise<{
  branchId?: string;
  method?: string;
  from?: string;
  to?: string;
}>;

export default async function PaymentsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requirePagePermission("payments.view");
  const canManage = hasPermission(session.role, "payments.manage");
  const isGlobalRole = session.role === "SUPER_ADMIN" || session.role === "ADMIN";

  const params = await searchParams;
  const selectedBranchId = searchValue(params.branchId);
  const selectedMethod = searchValue(params.method);
  const from = searchValue(params.from);
  const to = searchValue(params.to);

  const branchId = isGlobalRole ? selectedBranchId || null : (session.branchId ?? "__none__");
  const method = selectedMethod
    ? PaymentMethod[selectedMethod as keyof typeof PaymentMethod] ?? null
    : null;

  const [payments, branches, students, groups, activeFees] = await Promise.all([
    prisma.payment.findMany({
      where: {
        ...(branchId ? { branchId } : {}),
        ...(method ? { paymentMethod: method } : {}),
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
        student: {
          select: { firstName: true, lastName: true },
        },
        group: {
          select: { name: true },
        },
        branch: {
          select: { name: true },
        },
        createdBy: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
      take: 300,
    }),
    prisma.branch.findMany({
      where: isGlobalRole ? undefined : { id: session.branchId ?? "__none__" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.student.findMany({
      where: branchId ? { branchId } : undefined,
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
    prisma.studyGroup.findMany({
      where: branchId ? { branchId } : undefined,
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.studentFee.findMany({
      where: {
        status: StudentFeeStatus.ACTIVE,
        ...(branchId ? { branchId } : {}),
      },
      include: {
        student: {
          select: { firstName: true, lastName: true },
        },
        group: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="To'lovlar"
        description="To'lovlarni kiritish, oylik narxlarni sozlash va tarixni ko'rish"
      />

      <form className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-5">
        <Select name="method" defaultValue={selectedMethod}>
          <option value="">Barcha to'lov usullari</option>
          <option value="CASH">Naqd</option>
          <option value="CARD">Karta</option>
          <option value="CLICK">Click</option>
          <option value="PAYME">Payme</option>
          <option value="OTHER">Boshqa</option>
        </Select>
        <Select name="branchId" defaultValue={selectedBranchId} disabled={!isGlobalRole}>
          <option value="">Barcha filiallar</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
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

      {canManage ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>To'lov kiritish</CardTitle>
            </CardHeader>
            <CardContent>
              <PaymentForm students={students} groups={groups} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Oylik to'lov sozlamasi</CardTitle>
            </CardHeader>
            <CardContent>
              <StudentFeeForm students={students} groups={groups} />
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Faol oylik to'lovlar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {activeFees.length === 0 ? (
            <p className="text-slate-500">Faol oylik sozlamalari topilmadi.</p>
          ) : (
            activeFees.map((fee) => (
              <div key={fee.id} className="rounded-md border border-slate-100 p-2">
                <p className="font-medium">
                  {fee.student.firstName} {fee.student.lastName}
                </p>
                <p className="text-xs text-slate-500">
                  {fee.group.name} • {formatCurrencyFromCents(fee.monthlyFeeCents)} so'm / oy
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {payments.length === 0 ? (
        <EmptyState message="To'lovlar topilmadi." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <Table>
            <thead>
              <tr>
                <TableHead>Talaba</TableHead>
                <TableHead>Guruh</TableHead>
                <TableHead>Filial</TableHead>
                <TableHead>Summa</TableHead>
                <TableHead>Usul</TableHead>
                <TableHead>Sana</TableHead>
                <TableHead>Kiritgan</TableHead>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <TableCell>
                    {payment.student.firstName} {payment.student.lastName}
                  </TableCell>
                  <TableCell>{payment.group?.name ?? "-"}</TableCell>
                  <TableCell>{payment.branch.name}</TableCell>
                  <TableCell className="font-medium">
                    {formatCurrencyFromCents(payment.amountCents)} so'm
                  </TableCell>
                  <TableCell>{paymentMethodLabels[payment.paymentMethod]}</TableCell>
                  <TableCell>{formatDate(payment.paidAt)}</TableCell>
                  <TableCell>
                    {payment.createdBy.firstName} {payment.createdBy.lastName}
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
