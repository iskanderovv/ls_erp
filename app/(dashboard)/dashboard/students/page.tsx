import Link from "next/link";
import { Prisma, StudentStatus } from "@prisma/client";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableCell, TableHead } from "@/components/ui/table";
import { hasPermission } from "@/lib/auth/permissions";
import { requirePagePermission } from "@/lib/auth/session";
import { studentStatusLabels } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { searchValue } from "@/lib/search-params";

type SearchParams = Promise<{
  q?: string;
  branchId?: string;
  status?: string;
}>;

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await requirePagePermission("students.view");
  const canManage = hasPermission(session.role, "students.manage");
  const isGlobalRole = session.role === "SUPER_ADMIN" || session.role === "ADMIN";

  const params = await searchParams;
  const query = searchValue(params.q);
  const selectedStatus = searchValue(params.status);
  const selectedBranch = searchValue(params.branchId);

  const branchId = isGlobalRole ? selectedBranch || null : (session.branchId ?? "__no_branch__");

  const where: Prisma.StudentWhereInput = {
    ...(branchId ? { branchId } : {}),
    ...(selectedStatus
      ? {
          status: selectedStatus as StudentStatus,
        }
      : {}),
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

  const [students, branches] = await Promise.all([
    prisma.student.findMany({
      where,
      include: {
        branch: {
          select: { id: true, name: true },
        },
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
        title="Talabalar"
        description="Talabalarni boshqarish, qidirish va filtrlash"
        actionHref={canManage ? "/dashboard/students/new" : undefined}
        actionLabel={canManage ? "Talaba qo'shish" : undefined}
      />

      <form className="mb-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-4">
        <Input name="q" placeholder="Ism yoki telefon" defaultValue={query} />
        <Select name="status" defaultValue={selectedStatus}>
          <option value="">Barcha statuslar</option>
          <option value="ACTIVE">Faol</option>
          <option value="INACTIVE">Nofaol</option>
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

      {students.length === 0 ? (
        <EmptyState message="Talabalar topilmadi." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <Table>
            <thead>
              <tr>
                <TableHead>Talaba</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead>Filial</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[200px]">Amallar</TableHead>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id}>
                  <TableCell>
                    {student.firstName} {student.lastName}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p>{student.phone}</p>
                      {student.parentPhone ? (
                        <p className="text-xs text-slate-500">Ota-ona: {student.parentPhone}</p>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>{student.branch.name}</TableCell>
                  <TableCell>{studentStatusLabels[student.status]}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Link href={`/dashboard/students/${student.id}`} className="text-sm text-blue-700 hover:underline">
                        Ko'rish
                      </Link>
                      {canManage ? (
                        <Link
                          href={`/dashboard/students/${student.id}/edit`}
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
