import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { BranchAnalytics } from "@/components/branches/branch-analytics";
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
      <div className="flex items-center gap-4">
        <Link href="/dashboard/branches" className="rounded-full border border-slate-200 bg-white p-2 hover:bg-slate-50">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <PageHeader title={branch.name} description="Filial haqida batafsil ma'lumot va tahlillar" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-500">Asosiy ma'lumotlar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-slate-500">Telefon</p>
                <p className="font-medium">{branch.phone}</p>
              </div>
              <div>
                <p className="text-slate-500">Holat</p>
                <p className="font-medium">{branchStatusLabels[branch.status as keyof typeof branchStatusLabels]}</p>
              </div>
              <div>
                <p className="text-slate-500">Manzil</p>
                <p className="font-medium">{branch.address}</p>
              </div>
              <div>
                <p className="text-slate-500">Mo'ljal</p>
                <p className="font-medium">{branch.landmark ?? "-"}</p>
              </div>
              <div>
                <p className="text-slate-500">Yaratilgan</p>
                <p className="font-medium">{formatDate(branch.createdAt)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-500">Tezkor statistika</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-blue-50 p-3 text-center">
                <p className="text-xl font-bold text-blue-700">{branch._count.students}</p>
                <p className="text-xs text-blue-600">Talabalar</p>
              </div>
              <div className="rounded-lg bg-green-50 p-3 text-center">
                <p className="text-xl font-bold text-green-700">{branch._count.teachers}</p>
                <p className="text-xs text-green-600">Ustozlar</p>
              </div>
              <div className="rounded-lg bg-purple-50 p-3 text-center">
                <p className="text-xl font-bold text-purple-700">{branch._count.groups}</p>
                <p className="text-xs text-purple-600">Guruhlar</p>
              </div>
              <div className="rounded-lg bg-orange-50 p-3 text-center">
                <p className="text-xl font-bold text-orange-700">{branch._count.leads}</p>
                <p className="text-xs text-orange-600">Lidlar</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <BranchAnalytics branchId={id} />
        </div>
      </div>
    </div>
  );
}
