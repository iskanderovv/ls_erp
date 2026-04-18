import Link from "next/link";
import { GroupStatus, Prisma } from "@prisma/client";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableCell, TableHead } from "@/components/ui/table";
import { hasPermission } from "@/lib/auth/permissions";
import { requirePagePermission } from "@/lib/auth/session";
import { groupStatusLabels } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { searchValue } from "@/lib/search-params";
import { formatDate } from "@/lib/utils";

type SearchParams = Promise<{
  q?: string;
  branchId?: string;
  status?: string;
}>;

export default async function GroupsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requirePagePermission("groups.view");
  const canManage = hasPermission(session.role, "groups.manage");
  const isGlobalRole = session.role === "SUPER_ADMIN" || session.role === "ADMIN";

  const params = await searchParams;
  const query = searchValue(params.q);
  const selectedStatus = searchValue(params.status);
  const selectedBranch = searchValue(params.branchId);
  const branchId = isGlobalRole ? selectedBranch || null : (session.branchId ?? "__no_branch__");

  const where: Prisma.StudyGroupWhereInput = {
    ...(branchId ? { branchId } : {}),
    ...(selectedStatus ? { status: selectedStatus as GroupStatus } : {}),
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { subject: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [groups, branches] = await Promise.all([
    prisma.studyGroup.findMany({
      where,
      include: {
        branch: { select: { name: true } },
        teacher: { select: { firstName: true, lastName: true } },
        _count: { select: { students: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.branch.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Guruhlar"
        description="Guruhlar, ustoz biriktirish va talabalar tarkibi"
        actionHref={canManage ? "/dashboard/groups/new" : undefined}
        actionLabel={canManage ? "Guruh qo'shish" : undefined}
      />

      <form className="mb-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-4">
        <Input name="q" placeholder="Guruh nomi yoki fan" defaultValue={query} />
        <Select name="status" defaultValue={selectedStatus}>
          <option value="">Barcha statuslar</option>
          <option value="FORMING">Yig'ilmoqda</option>
          <option value="ACTIVE">Faol</option>
          <option value="COMPLETED">Yakunlangan</option>
          <option value="ARCHIVED">Arxiv</option>
        </Select>
        <Select name="branchId" defaultValue={selectedBranch} disabled={!isGlobalRole}>
          <option value="">Barcha filiallar</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </Select>
        <button
          type="submit"
          className="h-10 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
        >
          Filtrlash
        </button>
      </form>

      {groups.length === 0 ? (
        <EmptyState message="Guruhlar topilmadi." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <Table>
            <thead>
              <tr>
                <TableHead>Guruh</TableHead>
                <TableHead>Filial</TableHead>
                <TableHead>Ustoz</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Boshlanish</TableHead>
                <TableHead>Talabalar</TableHead>
                <TableHead className="w-[180px]">Amallar</TableHead>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <tr key={group.id}>
                  <TableCell>
                    <p className="font-medium">{group.name}</p>
                    <p className="text-xs text-slate-500">{group.subject}</p>
                  </TableCell>
                  <TableCell>{group.branch.name}</TableCell>
                  <TableCell>
                    {group.teacher ? `${group.teacher.firstName} ${group.teacher.lastName}` : "-"}
                  </TableCell>
                  <TableCell>{groupStatusLabels[group.status]}</TableCell>
                  <TableCell>{formatDate(group.startDate)}</TableCell>
                  <TableCell>{group._count.students}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Link href={`/dashboard/groups/${group.id}`} className="text-sm text-blue-700 hover:underline">
                        Ko'rish
                      </Link>
                      {canManage ? (
                        <Link
                          href={`/dashboard/groups/${group.id}/edit`}
                          className="text-sm text-slate-700 hover:underline"
                        >
                          Tahrirlash
                        </Link>
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
