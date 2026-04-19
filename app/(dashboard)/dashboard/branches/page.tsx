import Link from "next/link";
import { Edit, Eye } from "lucide-react";

import { DeleteBranchButton } from "@/components/branches/delete-branch-button";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableCell, TableHead } from "@/components/ui/table";
import { branchStatusLabels } from "@/lib/constants";
import { hasPermission } from "@/lib/auth/permissions";
import { requirePagePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export default async function BranchesPage() {
  const session = await requirePagePermission("branches.view");
  const canManage = hasPermission(session.role, "branches.manage");

  const branches = await prisma.branch.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          students: true,
          teachers: true,
          groups: true,
        },
      },
    },
  });

  return (
    <div>
      <PageHeader
        title="Filiallar"
        description="Markaz filiallari va ularning holati"
        actionHref={canManage ? "/dashboard/branches/new" : undefined}
        actionLabel={canManage ? "Filial qo'shish" : undefined}
      />

      {branches.length === 0 ? (
        <EmptyState message="Filiallar hali qo'shilmagan." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <Table>
            <thead>
              <tr>
                <TableHead>Nomi</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead>Holat</TableHead>
                <TableHead>Talabalar</TableHead>
                <TableHead>Ustozlar</TableHead>
                <TableHead>Guruhlar</TableHead>
                <TableHead>Yaratilgan</TableHead>
                <TableHead className="w-[160px]">Amallar</TableHead>
              </tr>
            </thead>
            <tbody>
              {branches.map((branch) => (
                <tr key={branch.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{branch.name}</p>
                      <p className="text-xs text-slate-500">{branch.address}</p>
                    </div>
                  </TableCell>
                  <TableCell>{branch.phone}</TableCell>
                  <TableCell>{branchStatusLabels[branch.status]}</TableCell>
                  <TableCell>{branch._count.students}</TableCell>
                  <TableCell>{branch._count.teachers}</TableCell>
                  <TableCell>{branch._count.groups}</TableCell>
                  <TableCell>{formatDate(branch.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button asChild variant="outline" size="sm" className="h-8 px-2 border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800">
                        <Link href={`/dashboard/branches/${branch.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      {canManage ? (
                        <>
                          <Button asChild variant="outline" size="sm" className="h-8 px-2 border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800">
                            <Link href={`/dashboard/branches/${branch.id}/edit`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                          <DeleteBranchButton id={branch.id} />
                        </>
                      ) : null}
                    </div>
                  </TableCell>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </div>
  );
}
