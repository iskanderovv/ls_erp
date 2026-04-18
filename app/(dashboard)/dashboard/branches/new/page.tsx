import { BranchForm } from "@/components/forms/branch-form";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requirePagePermission } from "@/lib/auth/session";

export default async function NewBranchPage() {
  await requirePagePermission("branches.manage");

  return (
    <div>
      <PageHeader title="Yangi filial" description="Yangi filial ma'lumotlarini kiriting" />
      <Card>
        <CardContent className="pt-5">
          <BranchForm />
        </CardContent>
      </Card>
    </div>
  );
}
