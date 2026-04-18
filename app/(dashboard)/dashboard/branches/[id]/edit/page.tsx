import { notFound } from "next/navigation";

import { BranchForm } from "@/components/forms/branch-form";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requirePagePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export default async function EditBranchPage({ params }: Params) {
  await requirePagePermission("branches.manage");
  const { id } = await params;

  const branch = await prisma.branch.findUnique({ where: { id } });
  if (!branch) notFound();

  return (
    <div>
      <PageHeader title="Filialni tahrirlash" description={branch.name} />
      <Card>
        <CardContent className="pt-5">
          <BranchForm
            initialData={{
              id: branch.id,
              name: branch.name,
              phone: branch.phone,
              address: branch.address,
              landmark: branch.landmark,
              status: branch.status,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
