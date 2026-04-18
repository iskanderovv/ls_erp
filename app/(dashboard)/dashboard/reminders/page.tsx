import { StudentFeeStatus } from "@prisma/client";

import { RunAutomationButton } from "@/components/automation/run-automation-button";
import { SendTelegramButton } from "@/components/telegram/send-telegram-button";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableCell, TableHead } from "@/components/ui/table";
import { hasPermission } from "@/lib/auth/permissions";
import { requirePagePermission } from "@/lib/auth/session";
import { feeExpectedAmount } from "@/lib/debt";
import { formatCurrencyFromCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export default async function RemindersPage() {
  const session = await requirePagePermission("reminders.view");
  const canManage = hasPermission(session.role, "reminders.manage");
  const branchId =
    session.role === "SUPER_ADMIN" || session.role === "ADMIN"
      ? null
      : (session.branchId ?? "__none__");

  const [reminderLogs, activeFees, absentToday] = await Promise.all([
    prisma.paymentReminder.findMany({
      where: branchId ? { branchId } : undefined,
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        group: { select: { id: true, name: true } },
        sentBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { sentAt: "desc" },
      take: 60,
    }),
    prisma.studentFee.findMany({
      where: {
        status: StudentFeeStatus.ACTIVE,
        ...(branchId ? { branchId } : {}),
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        group: { select: { id: true, name: true } },
      },
    }),
    prisma.attendance.findMany({
      where: {
        status: "ABSENT",
        group: branchId ? { branchId } : undefined,
        date: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lte: new Date(),
        },
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        group: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const now = new Date();
  const debtRows: Array<{
    studentId: string;
    studentName: string;
    groupName: string;
    debtCents: number;
  }> = [];
  for (const fee of activeFees) {
    const paid = await prisma.payment.aggregate({
      where: {
        studentId: fee.studentId,
        groupId: fee.groupId,
        paidAt: { gte: fee.startDate, lte: fee.endDate ?? now },
      },
      _sum: { amountCents: true },
    });
    const expected = feeExpectedAmount(fee, now);
    const debtCents = Math.max(0, expected - (paid._sum.amountCents ?? 0));
    if (debtCents <= 0) continue;
    debtRows.push({
      studentId: fee.student.id,
      studentName: `${fee.student.firstName} ${fee.student.lastName}`,
      groupName: fee.group.name,
      debtCents,
    });
  }
  debtRows.sort((a, b) => b.debtCents - a.debtCents);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Eslatmalar va avtomatika"
        description="Qarzlar, davomat muammolari va follow-up ishlarini avtomatlashtirish"
      />

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Automation engine</CardTitle>
          </CardHeader>
          <CardContent>
            <RunAutomationButton />
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Qarzdor talabalar (top 10)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {debtRows.length === 0 ? (
              <p className="text-sm text-slate-500">Qarzdorlik topilmadi.</p>
            ) : (
              debtRows.slice(0, 10).map((row) => (
                <div
                  key={`${row.studentId}-${row.groupName}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-100 p-2"
                >
                  <div>
                    <p className="text-sm font-medium">{row.studentName}</p>
                    <p className="text-xs text-slate-500">
                      {row.groupName} • {formatCurrencyFromCents(row.debtCents)} so'm
                    </p>
                  </div>
                  {canManage ? (
                    <SendTelegramButton
                      studentId={row.studentId}
                      type="PAYMENT_OVERDUE"
                      label="Qarz xabarini yuborish"
                    />
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bugungi ABSENT ro'yxati</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {absentToday.length === 0 ? (
              <p className="text-sm text-slate-500">Bugun ABSENT yo'q.</p>
            ) : (
              absentToday.map((row) => (
                <div
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-100 p-2"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {row.student.firstName} {row.student.lastName}
                    </p>
                    <p className="text-xs text-slate-500">{row.group.name}</p>
                  </div>
                  {canManage ? (
                    <SendTelegramButton
                      studentId={row.student.id}
                      type="ATTENDANCE_ABSENT"
                      label="Davomat xabarini yuborish"
                    />
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {reminderLogs.length === 0 ? (
        <EmptyState message="Eslatma loglari topilmadi." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <Table>
            <thead>
              <tr>
                <TableHead>Sana</TableHead>
                <TableHead>Talaba</TableHead>
                <TableHead>Guruh</TableHead>
                <TableHead>Izoh</TableHead>
                <TableHead>Yuborgan</TableHead>
              </tr>
            </thead>
            <tbody>
              {reminderLogs.map((log) => (
                <tr key={log.id}>
                  <TableCell>{formatDate(log.sentAt)}</TableCell>
                  <TableCell>
                    {log.student.firstName} {log.student.lastName}
                  </TableCell>
                  <TableCell>{log.group?.name ?? "-"}</TableCell>
                  <TableCell>{log.note ?? "-"}</TableCell>
                  <TableCell>
                    {log.sentBy.firstName} {log.sentBy.lastName}
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
