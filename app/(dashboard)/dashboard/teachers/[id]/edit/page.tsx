import { notFound } from "next/navigation";

import { TeacherForm } from "@/components/forms/teacher-form";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requirePagePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export default async function EditTeacherPage({ params }: Params) {
  const session = await requirePagePermission("teachers.manage");
  const { id } = await params;
  const isGlobalRole = session.role === "SUPER_ADMIN" || session.role === "ADMIN";
  const scopedBranchId = session.branchId ?? "__no_branch__";

  const teacher = await prisma.teacher.findUnique({ where: { id } });
  if (!teacher) notFound();
  if (!isGlobalRole && teacher.branchId !== session.branchId) notFound();

  const branches = await prisma.branch.findMany({
    where: isGlobalRole ? undefined : { id: scopedBranchId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader title="Ustozni tahrirlash" description={`${teacher.firstName} ${teacher.lastName}`} />
      <Card>
        <CardContent className="pt-5">
          <TeacherForm
            branches={branches}
            initialData={{
              id: teacher.id,
              firstName: teacher.firstName,
              lastName: teacher.lastName,
              phone: teacher.phone,
              specialtySubjects: teacher.specialtySubjects,
              branchId: teacher.branchId,
              status: teacher.status,
              hiredAt: teacher.hiredAt ? teacher.hiredAt.toISOString().slice(0, 10) : null,
              notes: teacher.notes,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
