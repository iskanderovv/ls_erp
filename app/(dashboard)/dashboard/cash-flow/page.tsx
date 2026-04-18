import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableCell, TableHead } from "@/components/ui/table";
import { paymentMethodLabels } from "@/lib/constants";
import { requirePagePermission } from "@/lib/auth/session";
import { formatCurrencyFromCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { searchValue } from "@/lib/search-params";
import { formatDate } from "@/lib/utils";

type SearchParams = Promise<{
  branchId?: string;
  from?: string;
  to?: string;
}>;

export default async function CashFlowPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requirePagePermission("payments.view");
  const isGlobalRole = session.role === "SUPER_ADMIN" || session.role === "ADMIN";

  const params = await searchParams;
  const selectedBranchId = searchValue(params.branchId);
  const from = searchValue(params.from);
  const to = searchValue(params.to);
  const branchId = isGlobalRole ? selectedBranchId || null : (session.branchId ?? "__none__");

  const [branches, payments] = await Promise.all([
    prisma.branch.findMany({
      where: isGlobalRole ? undefined : { id: session.branchId ?? "__none__" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.payment.findMany({
      where: {
        ...(branchId ? { branchId } : {}),
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
        branch: {
          select: { name: true },
        },
        createdBy: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
      take: 500,
    }),
  ]);

  const totalCents = payments.reduce((sum, payment) => sum + payment.amountCents, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kassa oqimi"
        description="Filial bo'yicha kirim to'lovlarining xronologik jurnali"
      />

      <form className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-4">
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

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm text-slate-500">Jami kirim</p>
        <p className="text-2xl font-bold">{formatCurrencyFromCents(totalCents)} so'm</p>
      </div>

      {payments.length === 0 ? (
        <EmptyState message="Tanlangan davrda to'lovlar topilmadi." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <Table>
            <thead>
              <tr>
                <TableHead>Sana</TableHead>
                <TableHead>Talaba</TableHead>
                <TableHead>Filial</TableHead>
                <TableHead>Usul</TableHead>
                <TableHead>Summa</TableHead>
                <TableHead>Kiritgan</TableHead>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <TableCell>{formatDate(payment.paidAt)}</TableCell>
                  <TableCell>
                    {payment.student.firstName} {payment.student.lastName}
                  </TableCell>
                  <TableCell>{payment.branch.name}</TableCell>
                  <TableCell>{paymentMethodLabels[payment.paymentMethod]}</TableCell>
                  <TableCell className="font-medium">
                    {formatCurrencyFromCents(payment.amountCents)} so'm
                  </TableCell>
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
