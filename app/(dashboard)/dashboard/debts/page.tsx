import { StudentFeeStatus } from "@prisma/client";

import { SendReminderButton } from "@/components/finance/send-reminder-button";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
import { Table, TableCell, TableHead } from "@/components/ui/table";
import { hasPermission } from "@/lib/auth/permissions";
import { feeExpectedAmount } from "@/lib/debt";
import { requirePagePermission } from "@/lib/auth/session";
import { formatCurrencyFromCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { searchValue } from "@/lib/search-params";

type SearchParams = Promise<{
  branchId?: string;
  groupId?: string;
}>;

export default async function DebtsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requirePagePermission("debts.view");
  const canSendReminder = hasPermission(session.role, "reminders.manage");
  const isGlobalRole = session.role === "SUPER_ADMIN" || session.role === "ADMIN";

  const params = await searchParams;
  const selectedBranchId = searchValue(params.branchId);
  const selectedGroupId = searchValue(params.groupId);
  const branchId = isGlobalRole ? selectedBranchId || null : (session.branchId ?? "__none__");

  const [branches, groups, fees] = await Promise.all([
    prisma.branch.findMany({
      where: isGlobalRole ? undefined : { id: session.branchId ?? "__none__" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
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
        ...(selectedGroupId ? { groupId: selectedGroupId } : {}),
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
          },
        },
        branch: {
          select: {
            name: true,
          },
        },
      },
      take: 300,
    }),
  ]);

  const now = new Date();
  const debtRows = await Promise.all(
    fees.map(async (fee) => {
      const paid = await prisma.payment.aggregate({
        where: {
          studentId: fee.studentId,
          groupId: fee.groupId,
          paidAt: {
            gte: fee.startDate,
            lte: fee.endDate ?? now,
          },
        },
        _sum: {
          amountCents: true,
        },
      });
      const reminderCount = await prisma.paymentReminder.count({
        where: {
          studentId: fee.studentId,
          groupId: fee.groupId,
        },
      });

      const expectedCents = feeExpectedAmount(fee, now);
      const paidCents = paid._sum.amountCents ?? 0;
      const debtCents = Math.max(0, expectedCents - paidCents);

      return {
        feeId: fee.id,
        studentId: fee.student.id,
        groupId: fee.group.id,
        studentName: `${fee.student.firstName} ${fee.student.lastName}`,
        studentPhone: fee.student.phone,
        groupName: fee.group.name,
        branchName: fee.branch.name,
        expectedCents,
        paidCents,
        debtCents,
        reminderCount,
      };
    }),
  );

  const rows = debtRows.filter((row) => row.debtCents > 0).sort((a, b) => b.debtCents - a.debtCents);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Qarzlar"
        description="Talabalar qarzdorligi va eslatma yuborish nazorati"
      />

      <form className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-3">
        <Select name="branchId" defaultValue={selectedBranchId} disabled={!isGlobalRole}>
          <option value="">Barcha filiallar</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </Select>
        <Select name="groupId" defaultValue={selectedGroupId}>
          <option value="">Barcha guruhlar</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </Select>
        <button
          type="submit"
          className="h-10 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
        >
          Filtrlash
        </button>
      </form>

      {rows.length === 0 ? (
        <EmptyState message="Qarzdor talabalar topilmadi." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <Table>
            <thead>
              <tr>
                <TableHead>Talaba</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead>Filial</TableHead>
                <TableHead>Guruh</TableHead>
                <TableHead>Kutilgan</TableHead>
                <TableHead>To'langan</TableHead>
                <TableHead>Qarzdorlik</TableHead>
                <TableHead>Eslatma</TableHead>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.feeId}>
                  <TableCell>{row.studentName}</TableCell>
                  <TableCell>{row.studentPhone}</TableCell>
                  <TableCell>{row.branchName}</TableCell>
                  <TableCell>{row.groupName}</TableCell>
                  <TableCell>{formatCurrencyFromCents(row.expectedCents)} so'm</TableCell>
                  <TableCell>{formatCurrencyFromCents(row.paidCents)} so'm</TableCell>
                  <TableCell className="font-semibold text-red-600">
                    {formatCurrencyFromCents(row.debtCents)} so'm
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500">{row.reminderCount} marta</p>
                      {canSendReminder ? (
                        <SendReminderButton studentId={row.studentId} groupId={row.groupId} />
                      ) : null}
                    </div>
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
