import { notFound } from "next/navigation";

import { GroupForm } from "@/components/forms/group-form";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requirePagePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export default async function EditGroupPage({ params }: Params) {
  const session = await requirePagePermission("groups.manage");
  const { id } = await params;
  const isGlobalRole = session.role === "SUPER_ADMIN" || session.role === "ADMIN";
  const scopedBranchId = session.branchId ?? "__no_branch__";

  const group = await prisma.studyGroup.findUnique({ where: { id } });
  if (!group) notFound();
  if (!isGlobalRole && group.branchId !== session.branchId) notFound();

  const [branches, teachers] = await Promise.all([
    prisma.branch.findMany({
      where: isGlobalRole ? undefined : { id: scopedBranchId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.teacher.findMany({
      where: isGlobalRole ? undefined : { branchId: scopedBranchId },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader title="Guruhni tahrirlash" description={group.name} />
      <Card>
        <CardContent className="pt-5">
          <GroupForm
            branches={branches}
            teachers={teachers}
            initialData={{
              id: group.id,
              name: group.name,
              subject: group.subject,
              teacherId: group.teacherId,
              branchId: group.branchId,
              room: group.room,
              startDate: group.startDate.toISOString().slice(0, 10),
              status: group.status,
              maxStudents: group.maxStudents,
              notes: group.notes,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
