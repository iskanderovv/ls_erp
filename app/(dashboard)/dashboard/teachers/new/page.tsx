import { TeacherForm } from "@/components/forms/teacher-form";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requirePagePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function NewTeacherPage() {
  const session = await requirePagePermission("teachers.manage");
  const isGlobalRole = session.role === "SUPER_ADMIN" || session.role === "ADMIN";
  const scopedBranchId = session.branchId ?? "__no_branch__";

  const branches = await prisma.branch.findMany({
    where: isGlobalRole ? undefined : { id: scopedBranchId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader title="Yangi ustoz" description="Ustoz ma'lumotlarini kiriting" />
      <Card>
        <CardContent className="pt-5">
          <TeacherForm branches={branches} />
        </CardContent>
      </Card>
    </div>
  );
}
