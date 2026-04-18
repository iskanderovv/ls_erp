import Link from "next/link";
import { notFound } from "next/navigation";

import { AttachStudentForm } from "@/components/groups/attach-student-form";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { groupStatusLabels } from "@/lib/constants";
import { hasPermission } from "@/lib/auth/permissions";
import { requirePagePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

export default async function GroupDetailsPage({ params }: Params) {
  const session = await requirePagePermission("groups.view");
  const { id } = await params;
  const isGlobalRole = session.role === "SUPER_ADMIN" || session.role === "ADMIN";
  const canManage = hasPermission(session.role, "groups.manage");

  const group = await prisma.studyGroup.findUnique({
    where: { id },
    include: {
      branch: { select: { id: true, name: true } },
      teacher: { select: { firstName: true, lastName: true } },
      students: {
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true, phone: true },
          },
        },
        orderBy: { joinedAt: "desc" },
      },
    },
  });

  if (!group) notFound();
  if (!isGlobalRole && group.branchId !== session.branchId) notFound();

  const assignedStudentIds = new Set(group.students.map((item) => item.studentId));
  const availableStudents = canManage
    ? await prisma.student.findMany({
        where: {
          branchId: group.branchId,
          id: { notIn: Array.from(assignedStudentIds) },
        },
        select: { id: true, firstName: true, lastName: true, phone: true },
        orderBy: { firstName: "asc" },
      })
    : [];

  const attendanceRows = await prisma.attendance.findMany({
    where: { groupId: group.id },
    include: {
      student: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 500,
  });

  const totalMarks = attendanceRows.length;
  const presentCount = attendanceRows.filter((row) => row.status === "PRESENT").length;
  const attendancePercentage = totalMarks ? Math.round((presentCount / totalMarks) * 100) : 0;

  const recentDateMap = new Map<
    string,
    { present: number; absent: number; late: number; total: number }
  >();
  for (const row of attendanceRows) {
    const dateKey = row.date.toISOString().slice(0, 10);
    if (!recentDateMap.has(dateKey)) {
      recentDateMap.set(dateKey, { present: 0, absent: 0, late: 0, total: 0 });
    }
    const item = recentDateMap.get(dateKey)!;
    item.total += 1;
    if (row.status === "PRESENT") item.present += 1;
    if (row.status === "ABSENT") item.absent += 1;
    if (row.status === "LATE") item.late += 1;
  }
  const recentAttendance = Array.from(recentDateMap.entries()).slice(0, 5);
  const latestDate = recentAttendance[0]?.[0] ?? null;
  const latestAbsentStudents = latestDate
    ? attendanceRows.filter(
        (row) => row.status === "ABSENT" && row.date.toISOString().slice(0, 10) === latestDate,
      )
    : [];

  return (
    <div className="space-y-6">
      <PageHeader title={group.name} description="Guruh ma'lumotlari va talabalar ro'yxati" />

      <Card>
        <CardHeader>
          <CardTitle>Asosiy ma'lumotlar</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          <p>
            <span className="text-slate-500">Fan:</span> {group.subject}
          </p>
          <p>
            <span className="text-slate-500">Filial:</span> {group.branch.name}
          </p>
          <p>
            <span className="text-slate-500">Ustoz:</span>{" "}
            {group.teacher ? `${group.teacher.firstName} ${group.teacher.lastName}` : "-"}
          </p>
          <p>
            <span className="text-slate-500">Status:</span> {groupStatusLabels[group.status]}
          </p>
          <p>
            <span className="text-slate-500">Boshlanish sanasi:</span> {formatDate(group.startDate)}
          </p>
          <p>
            <span className="text-slate-500">Xona:</span> {group.room ?? "-"}
          </p>
          <p>
            <span className="text-slate-500">Sig'im:</span> {group.students.length}/{group.maxStudents}
          </p>
          <p className="md:col-span-2">
            <span className="text-slate-500">Izoh:</span> {group.notes ?? "-"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Talabalar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {canManage ? (
            <AttachStudentForm groupId={group.id} students={availableStudents} />
          ) : null}

          {group.students.length === 0 ? (
            <p className="text-sm text-slate-500">Bu guruhga hali talaba biriktirilmagan.</p>
          ) : (
            <div className="space-y-2">
              {group.students.map((item) => (
                <div
                  key={item.studentId}
                  className="rounded-md border border-slate-100 p-3 text-sm"
                >
                  <p className="font-medium">
                    {item.student.firstName} {item.student.lastName}
                  </p>
                  <p className="text-xs text-slate-500">{item.student.phone}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Davomat ko'rsatkichlari</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-md border border-slate-100 p-3">
              <p className="text-xs text-slate-500">Umumiy davomat foizi</p>
              <p className="text-2xl font-bold">{attendancePercentage}%</p>
            </div>
            <div className="rounded-md border border-slate-100 p-3">
              <p className="text-xs text-slate-500">Belgilangani</p>
              <p className="text-2xl font-bold">{totalMarks}</p>
            </div>
            <div className="rounded-md border border-slate-100 p-3">
              <p className="text-xs text-slate-500">Kelmaganlar (oxirgi sana)</p>
              <p className="text-2xl font-bold text-red-600">{latestAbsentStudents.length}</p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <p className="font-medium">So'nggi davomat kesimi</p>
            {recentAttendance.length === 0 ? (
              <p className="text-slate-500">Davomat ma'lumotlari hali yo'q.</p>
            ) : (
              recentAttendance.map(([dateKey, item]) => (
                <div key={dateKey} className="rounded-md border border-slate-100 p-3">
                  <p className="font-medium">{formatDate(dateKey)}</p>
                  <p className="text-xs text-slate-500">
                    Kelgan: {item.present} • Kelmagan: {item.absent} • Kechikkan: {item.late}
                  </p>
                </div>
              ))
            )}
          </div>

          <div className="space-y-2 text-sm">
            <p className="font-medium">Kelmagan talabalar (oxirgi sana)</p>
            {latestAbsentStudents.length === 0 ? (
              <p className="text-slate-500">Kelmaganlar yo'q yoki davomat kiritilmagan.</p>
            ) : (
              latestAbsentStudents.map((row) => (
                <div
                  key={row.id}
                  className="rounded-md border border-slate-100 p-3 text-red-700"
                >
                  {row.student.firstName} {row.student.lastName}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Link href="/dashboard/groups" className="text-sm text-blue-700 hover:underline">
        Guruhlar ro'yxatiga qaytish
      </Link>
    </div>
  );
}
