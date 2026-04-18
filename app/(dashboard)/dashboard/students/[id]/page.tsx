import Link from "next/link";
import { notFound } from "next/navigation";

import { StudentFeeForm } from "@/components/forms/student-fee-form";
import { SendReminderButton } from "@/components/finance/send-reminder-button";
import { TelegramConfigForm } from "@/components/students/telegram-config-form";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { attendanceStatusLabels, genderLabels, studentStatusLabels } from "@/lib/constants";
import { feeExpectedAmount } from "@/lib/debt";
import { hasPermission } from "@/lib/auth/permissions";
import { requirePagePermission } from "@/lib/auth/session";
import { formatCurrencyFromCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

export default async function StudentDetailsPage({ params }: Params) {
  const session = await requirePagePermission("students.view");
  const { id } = await params;
  const isGlobalRole = session.role === "SUPER_ADMIN" || session.role === "ADMIN";
  const canViewFinance = hasPermission(session.role, "payments.view");
  const canManageFinance = hasPermission(session.role, "payments.manage");
  const canManageReminders = hasPermission(session.role, "reminders.manage");
  const canManageStudents = hasPermission(session.role, "students.manage");

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      branch: {
        select: { id: true, name: true },
      },
      groups: {
        include: {
          group: {
            select: { id: true, name: true, subject: true },
          },
        },
        orderBy: { joinedAt: "desc" },
      },
    },
  });

  if (!student) notFound();
  if (!isGlobalRole && student.branchId !== session.branchId) notFound();

  const now = new Date();
  const [paymentHistory, feeRows, reminderRows, attendanceRows, groupsForFeeForm] =
    await Promise.all([
      canViewFinance
        ? prisma.payment.findMany({
            where: { studentId: student.id },
            include: {
              group: { select: { id: true, name: true } },
              createdBy: { select: { firstName: true, lastName: true } },
            },
            orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
            take: 80,
          })
        : Promise.resolve([]),
      canViewFinance
        ? prisma.studentFee.findMany({
            where: {
              studentId: student.id,
            },
            include: {
              group: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: "desc" },
          })
        : Promise.resolve([]),
      canViewFinance
        ? prisma.paymentReminder.findMany({
            where: { studentId: student.id },
            include: {
              group: { select: { name: true } },
              sentBy: { select: { firstName: true, lastName: true } },
            },
            orderBy: { sentAt: "desc" },
            take: 20,
          })
        : Promise.resolve([]),
      prisma.attendance.findMany({
        where: { studentId: student.id },
        include: {
          group: { select: { id: true, name: true } },
        },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: 60,
      }),
      canManageFinance
        ? prisma.studyGroup.findMany({
            where: { branchId: student.branchId },
            select: { id: true, name: true },
            orderBy: { name: "asc" },
          })
        : Promise.resolve([]),
    ]);

  const feeFinancialRows = canViewFinance
    ? await Promise.all(
        feeRows.map(async (fee) => {
          const paid = await prisma.payment.aggregate({
            where: {
              studentId: student.id,
              groupId: fee.groupId,
              paidAt: {
                gte: fee.startDate,
                lte: fee.endDate ?? now,
              },
            },
            _sum: { amountCents: true },
          });
          const expectedCents = feeExpectedAmount(fee, now);
          const paidCents = paid._sum.amountCents ?? 0;
          const debtCents = Math.max(0, expectedCents - paidCents);
          return {
            fee,
            expectedCents,
            paidCents,
            debtCents,
          };
        }),
      )
    : [];

  const totalPaidCents = paymentHistory.reduce((sum, payment) => sum + payment.amountCents, 0);
  const totalDebtCents = feeFinancialRows.reduce((sum, row) => sum + row.debtCents, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${student.firstName} ${student.lastName}`}
        description="Talaba profili"
      />

      <Card>
        <CardHeader>
          <CardTitle>Asosiy ma'lumotlar</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          <p>
            <span className="text-slate-500">Telefon:</span> {student.phone}
          </p>
          <p>
            <span className="text-slate-500">Ota-ona telefoni:</span> {student.parentPhone ?? "-"}
          </p>
          <p>
            <span className="text-slate-500">Filial:</span> {student.branch.name}
          </p>
          <p>
            <span className="text-slate-500">Status:</span> {studentStatusLabels[student.status]}
          </p>
          <p>
            <span className="text-slate-500">Jinsi:</span>{" "}
            {student.gender ? genderLabels[student.gender] : "-"}
          </p>
          <p>
            <span className="text-slate-500">Tug'ilgan sana:</span> {formatDate(student.birthDate)}
          </p>
          <p>
            <span className="text-slate-500">Maktab:</span> {student.schoolName ?? "-"}
          </p>
          <p>
            <span className="text-slate-500">Sinf:</span> {student.gradeLevel ?? "-"}
          </p>
          <p>
            <span className="text-slate-500">Maqsad yili:</span> {student.targetExamYear ?? "-"}
          </p>
          <p>
            <span className="text-slate-500">Yaratilgan:</span> {formatDate(student.createdAt)}
          </p>
          <p className="md:col-span-2">
            <span className="text-slate-500">Izoh:</span> {student.notes ?? "-"}
          </p>
        </CardContent>
      </Card>

      {canManageStudents ? (
        <Card>
          <CardHeader>
            <CardTitle>Telegram sozlamalari</CardTitle>
          </CardHeader>
          <CardContent>
            <TelegramConfigForm
              studentId={student.id}
              initial={{
                telegramChatId: student.telegramChatId,
                telegramOptIn: student.telegramOptIn,
                parentTelegramChatId: student.parentTelegramChatId,
                parentTelegramOptIn: student.parentTelegramOptIn,
              }}
            />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Guruhlar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {student.groups.length === 0 ? (
            <p className="text-slate-500">Talaba hali guruhlarga biriktirilmagan.</p>
          ) : (
            student.groups.map((item) => (
              <div key={item.groupId} className="rounded-md border border-slate-100 p-3">
                <p className="font-medium">{item.group.name}</p>
                <p className="text-xs text-slate-500">{item.group.subject}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Davomat tarixi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {attendanceRows.length === 0 ? (
            <p className="text-slate-500">Davomat ma'lumotlari topilmadi.</p>
          ) : (
            attendanceRows.map((row) => (
              <div key={row.id} className="rounded-md border border-slate-100 p-3">
                <p className="font-medium">{row.group.name}</p>
                <p className="text-xs text-slate-500">
                  {formatDate(row.date)} • {attendanceStatusLabels[row.status]}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {canViewFinance ? (
        <Card>
          <CardHeader>
            <CardTitle>Moliyaviy profil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-md border border-slate-100 p-3">
                <p className="text-xs text-slate-500">Jami to'langan</p>
                <p className="text-xl font-bold">{formatCurrencyFromCents(totalPaidCents)} so'm</p>
              </div>
              <div className="rounded-md border border-slate-100 p-3">
                <p className="text-xs text-slate-500">Jami qarzdorlik</p>
                <p className="text-xl font-bold text-red-600">
                  {formatCurrencyFromCents(totalDebtCents)} so'm
                </p>
              </div>
              <div className="rounded-md border border-slate-100 p-3">
                <p className="text-xs text-slate-500">To'lovlar soni</p>
                <p className="text-xl font-bold">{paymentHistory.length}</p>
              </div>
            </div>

            {canManageReminders ? (
              <SendReminderButton studentId={student.id} groupId={feeRows[0]?.groupId} />
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {canManageFinance ? (
        <Card>
          <CardHeader>
            <CardTitle>Oylik to'lov sozlamasi</CardTitle>
          </CardHeader>
          <CardContent>
            <StudentFeeForm
              students={[
                { id: student.id, firstName: student.firstName, lastName: student.lastName },
              ]}
              groups={groupsForFeeForm}
              defaultStudentId={student.id}
            />
          </CardContent>
        </Card>
      ) : null}

      {canViewFinance ? (
        <Card>
          <CardHeader>
            <CardTitle>Guruh bo'yicha oylik va qarz</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {feeFinancialRows.length === 0 ? (
              <p className="text-slate-500">Oylik to'lov sozlamalari topilmadi.</p>
            ) : (
              feeFinancialRows.map((row) => (
                <div key={row.fee.id} className="rounded-md border border-slate-100 p-3">
                  <p className="font-medium">{row.fee.group.name}</p>
                  <p className="text-xs text-slate-500">
                    Oylik: {formatCurrencyFromCents(row.fee.monthlyFeeCents)} so'm • Kutilgan:{" "}
                    {formatCurrencyFromCents(row.expectedCents)} so'm • To'langan:{" "}
                    {formatCurrencyFromCents(row.paidCents)} so'm
                  </p>
                  <p className="mt-1 text-sm font-semibold text-red-600">
                    Qarz: {formatCurrencyFromCents(row.debtCents)} so'm
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ) : null}

      {canViewFinance ? (
        <Card>
          <CardHeader>
            <CardTitle>To'lovlar tarixi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {paymentHistory.length === 0 ? (
              <p className="text-slate-500">To'lovlar topilmadi.</p>
            ) : (
              paymentHistory.map((payment) => (
                <div key={payment.id} className="rounded-md border border-slate-100 p-3">
                  <p className="font-medium">
                    {formatCurrencyFromCents(payment.amountCents)} so'm •{" "}
                    {payment.group?.name ?? "Guruhsiz"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatDate(payment.paidAt)} • {payment.paymentMethod} •{" "}
                    {payment.createdBy.firstName} {payment.createdBy.lastName}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ) : null}

      {canViewFinance ? (
        <Card>
          <CardHeader>
            <CardTitle>Eslatma tarixi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {reminderRows.length === 0 ? (
              <p className="text-slate-500">Eslatma yuborilmagan.</p>
            ) : (
              reminderRows.map((reminder) => (
                <div key={reminder.id} className="rounded-md border border-slate-100 p-3">
                  <p className="font-medium">{reminder.group?.name ?? "Guruhsiz"}</p>
                  <p className="text-xs text-slate-500">
                    {formatDate(reminder.sentAt)} • {reminder.sentBy.firstName}{" "}
                    {reminder.sentBy.lastName}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ) : null}

      <Link href="/dashboard/students" className="text-sm text-blue-700 hover:underline">
        Talabalar ro'yxatiga qaytish
      </Link>
    </div>
  );
}
