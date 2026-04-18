import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { branchStatusLabels } from "@/lib/constants";
import { requirePagePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

export default async function BranchDetailsPage({ params }: Params) {
  await requirePagePermission("branches.view");
  const { id } = await params;

  const branch = await prisma.branch.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          students: true,
          teachers: true,
          groups: true,
          leads: true,
        },
      },
    },
  });

  if (!branch) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title={branch.name} description="Filial haqida batafsil ma'lumot" />

      <Card>
        <CardHeader>
          <CardTitle>Asosiy ma'lumotlar</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          <p>
            <span className="text-slate-500">Telefon:</span> {branch.phone}
          </p>
          <p>
            <span className="text-slate-500">Holat:</span> {branchStatusLabels[branch.status as keyof typeof branchStatusLabels]}
          </p>
          <p>
            <span className="text-slate-500">Manzil:</span> {branch.address}
          </p>
          <p>
            <span className="text-slate-500">Mo'ljal:</span> {branch.landmark ?? "-"}
          </p>
          <p>
            <span className="text-slate-500">Yaratilgan:</span> {formatDate(branch.createdAt)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Statistika</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          <p>Talabalar: {branch._count.students}</p>
          <p>Ustozlar: {branch._count.teachers}</p>
          <p>Guruhlar: {branch._count.groups}</p>
          <p>Lidlar: {branch._count.leads}</p>
        </CardContent>
      </Card>

      <Link href="/dashboard/branches" className="text-sm text-blue-700 hover:underline">
        Filiallar ro'yxatiga qaytish
      </Link>
    </div>
  );
}
