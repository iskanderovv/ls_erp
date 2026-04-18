import Link from "next/link";
import { Prisma, TeacherStatus } from "@prisma/client";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableCell, TableHead } from "@/components/ui/table";
import { hasPermission } from "@/lib/auth/permissions";
import { requirePagePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { searchValue } from "@/lib/search-params";
import { teacherStatusLabels } from "@/lib/constants";

type SearchParams = Promise<{
  q?: string;
  branchId?: string;
  status?: string;
}>;

export default async function TeachersPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requirePagePermission("teachers.view");
  const canManage = hasPermission(session.role, "teachers.manage");
  const isGlobalRole = session.role === "SUPER_ADMIN" || session.role === "ADMIN";

  const params = await searchParams;
  const query = searchValue(params.q);
  const selectedStatus = searchValue(params.status);
  const selectedBranch = searchValue(params.branchId);
  const branchId = isGlobalRole ? selectedBranch || null : (session.branchId ?? "__no_branch__");

  const where: Prisma.TeacherWhereInput = {
    ...(branchId ? { branchId } : {}),
    ...(selectedStatus ? { status: selectedStatus as TeacherStatus } : {}),
    ...(query
      ? {
          OR: [
            { firstName: { contains: query, mode: "insensitive" } },
            { lastName: { contains: query, mode: "insensitive" } },
            { phone: { contains: query } },
          ],
        }
      : {}),
  };

  const [teachers, branches] = await Promise.all([
    prisma.teacher.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true } },
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
        title="Ustozlar"
        description="Ustozlar va ularning fanlari"
        actionHref={canManage ? "/dashboard/teachers/new" : undefined}
        actionLabel={canManage ? "Ustoz qo'shish" : undefined}
      />

      <form className="mb-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-4">
        <Input name="q" placeholder="Ism yoki telefon" defaultValue={query} />
        <Select name="status" defaultValue={selectedStatus}>
          <option value="">Barcha statuslar</option>
          <option value="ACTIVE">Faol</option>
          <option value="INACTIVE">Nofaol</option>
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

      {teachers.length === 0 ? (
        <EmptyState message="Ustozlar topilmadi." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <Table>
            <thead>
              <tr>
                <TableHead>Ustoz</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead>Fanlar</TableHead>
                <TableHead>Filial</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[180px]">Amallar</TableHead>
              </tr>
            </thead>
            <tbody>
              {teachers.map((teacher) => (
                <tr key={teacher.id}>
                  <TableCell>
                    {teacher.firstName} {teacher.lastName}
                  </TableCell>
                  <TableCell>{teacher.phone}</TableCell>
                  <TableCell>{teacher.specialtySubjects.join(", ")}</TableCell>
                  <TableCell>{teacher.branch.name}</TableCell>
                  <TableCell>{teacherStatusLabels[teacher.status]}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Link href={`/dashboard/teachers/${teacher.id}`} className="text-sm text-blue-700 hover:underline">
                        Ko'rish
                      </Link>
                      {canManage ? (
                        <Link
                          href={`/dashboard/teachers/${teacher.id}/edit`}
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
