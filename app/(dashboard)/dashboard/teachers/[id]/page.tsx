import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { teacherStatusLabels } from "@/lib/constants";
import { requirePagePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

export default async function TeacherDetailsPage({ params }: Params) {
  const session = await requirePagePermission("teachers.view");
  const { id } = await params;
  const isGlobalRole = session.role === "SUPER_ADMIN" || session.role === "ADMIN";

  const teacher = await prisma.teacher.findUnique({
    where: { id },
    include: {
      branch: { select: { name: true } },
      groups: {
        select: {
          id: true,
          name: true,
          subject: true,
          status: true,
        },
      },
    },
  });
  if (!teacher) notFound();
  if (!isGlobalRole && teacher.branchId !== session.branchId) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${teacher.firstName} ${teacher.lastName}`}
        description="Ustoz profili"
      />

      <Card>
        <CardHeader>
          <CardTitle>Asosiy ma'lumotlar</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          <p>
            <span className="text-slate-500">Telefon:</span> {teacher.phone}
          </p>
          <p>
            <span className="text-slate-500">Filial:</span> {teacher.branch.name}
          </p>
          <p>
            <span className="text-slate-500">Status:</span> {teacherStatusLabels[teacher.status]}
          </p>
          <p>
            <span className="text-slate-500">Ishga kirgan sana:</span> {formatDate(teacher.hiredAt)}
          </p>
          <p className="md:col-span-2">
            <span className="text-slate-500">Fanlar:</span> {teacher.specialtySubjects.join(", ")}
          </p>
          <p className="md:col-span-2">
            <span className="text-slate-500">Izoh:</span> {teacher.notes ?? "-"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Biriktirilgan guruhlar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {teacher.groups.length === 0 ? (
            <p className="text-slate-500">Hozircha guruh biriktirilmagan.</p>
          ) : (
            teacher.groups.map((group) => (
              <div key={group.id} className="rounded-md border border-slate-100 p-3">
                <p className="font-medium">{group.name}</p>
                <p className="text-xs text-slate-500">{group.subject}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Link href="/dashboard/teachers" className="text-sm text-blue-700 hover:underline">
        Ustozlar ro'yxatiga qaytish
      </Link>
    </div>
  );
}
