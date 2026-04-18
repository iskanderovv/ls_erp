import { notFound } from "next/navigation";

import { StudentForm } from "@/components/forms/student-form";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requirePagePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export default async function EditStudentPage({ params }: Params) {
  const session = await requirePagePermission("students.manage");
  const { id } = await params;
  const isGlobalRole = session.role === "SUPER_ADMIN" || session.role === "ADMIN";
  const scopedBranchId = session.branchId ?? "__no_branch__";

  const student = await prisma.student.findUnique({
    where: { id },
  });
  if (!student) notFound();

  if (!isGlobalRole && student.branchId !== session.branchId) {
    notFound();
  }

  const branches = await prisma.branch.findMany({
    where: isGlobalRole ? undefined : { id: scopedBranchId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader title="Talabani tahrirlash" description={`${student.firstName} ${student.lastName}`} />
      <Card>
        <CardContent className="pt-5">
          <StudentForm
            branches={branches}
            initialData={{
              id: student.id,
              firstName: student.firstName,
              lastName: student.lastName,
              phone: student.phone,
              parentPhone: student.parentPhone,
              gender: student.gender,
              birthDate: student.birthDate ? student.birthDate.toISOString().slice(0, 10) : null,
              schoolName: student.schoolName,
              gradeLevel: student.gradeLevel,
              targetExamYear: student.targetExamYear,
              notes: student.notes,
              status: student.status,
              branchId: student.branchId,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
