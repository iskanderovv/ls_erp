import { Role } from "@prisma/client";

import { LeadForm } from "@/components/forms/lead-form";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requirePagePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function NewLeadPage() {
  const session = await requirePagePermission("leads.manage");
  const isGlobalRole = session.role === "SUPER_ADMIN" || session.role === "ADMIN";
  const scopedBranchId = session.branchId ?? "__no_branch__";

  const [branches, assignees] = await Promise.all([
    prisma.branch.findMany({
      where: isGlobalRole ? undefined : { id: scopedBranchId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: {
        role: {
          in: [Role.ADMIN, Role.MANAGER],
        },
        ...(isGlobalRole ? {} : { branchId: scopedBranchId }),
      },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader title="Yangi lid" description="Lid ma'lumotlarini kiriting" />
      <Card>
        <CardContent className="pt-5">
          <LeadForm branches={branches} assignees={assignees} />
        </CardContent>
      </Card>
    </div>
  );
}
