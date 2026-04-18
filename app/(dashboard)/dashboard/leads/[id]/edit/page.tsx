import { Role } from "@prisma/client";
import { notFound } from "next/navigation";

import { LeadForm } from "@/components/forms/lead-form";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requirePagePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export default async function EditLeadPage({ params }: Params) {
  const session = await requirePagePermission("leads.manage");
  const { id } = await params;
  const isGlobalRole = session.role === "SUPER_ADMIN" || session.role === "ADMIN";
  const scopedBranchId = session.branchId ?? "__no_branch__";

  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) notFound();
  if (!isGlobalRole && lead.branchId !== session.branchId) notFound();

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
      <PageHeader title="Lidni tahrirlash" description={lead.firstName} />
      <Card>
        <CardContent className="pt-5">
          <LeadForm
            branches={branches}
            assignees={assignees}
            initialData={{
              id: lead.id,
              firstName: lead.firstName,
              lastName: lead.lastName,
              phone: lead.phone,
              source: lead.source,
              interestedSubject: lead.interestedSubject,
              status: lead.status,
              notes: lead.notes,
              branchId: lead.branchId,
              assignedToId: lead.assignedToId,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
