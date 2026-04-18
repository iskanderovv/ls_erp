import { GroupForm } from "@/components/forms/group-form";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requirePagePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function NewGroupPage() {
  const session = await requirePagePermission("groups.manage");
  const isGlobalRole = session.role === "SUPER_ADMIN" || session.role === "ADMIN";
  const scopedBranchId = session.branchId ?? "__no_branch__";

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
      <PageHeader title="Yangi guruh" description="Guruh ma'lumotlarini kiriting" />
      <Card>
        <CardContent className="pt-5">
          <GroupForm branches={branches} teachers={teachers} />
        </CardContent>
      </Card>
    </div>
  );
}
