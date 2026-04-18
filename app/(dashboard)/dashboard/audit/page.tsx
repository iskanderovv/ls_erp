import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableCell, TableHead } from "@/components/ui/table";
import { requirePagePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { searchValue } from "@/lib/search-params";
import { formatDate } from "@/lib/utils";

type SearchParams = Promise<{
  branchId?: string;
  entityType?: string;
  from?: string;
  to?: string;
}>;

export default async function AuditPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requirePagePermission("audit.view");
  const isGlobalRole = session.role === "SUPER_ADMIN" || session.role === "ADMIN";
  const scopedBranchId = session.branchId ?? "__none__";

  const params = await searchParams;
  const selectedBranchId = searchValue(params.branchId);
  const selectedEntityType = searchValue(params.entityType);
  const from = searchValue(params.from);
  const to = searchValue(params.to);
  const branchId = isGlobalRole ? selectedBranchId || null : scopedBranchId;

  const [branches, entityTypes, logs] = await Promise.all([
    prisma.branch.findMany({
      where: isGlobalRole ? undefined : { id: scopedBranchId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.auditLog.findMany({
      select: { entityType: true },
      distinct: ["entityType"],
      orderBy: { entityType: "asc" },
    }),
    prisma.auditLog.findMany({
      where: {
        ...(branchId ? { branchId } : {}),
        ...(selectedEntityType ? { entityType: selectedEntityType } : {}),
        ...(from || to
          ? {
              createdAt: {
                ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
                ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
              },
            }
          : {}),
      },
      include: {
        branch: { select: { name: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 700,
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit log"
        description="Kim, qachon va qaysi moliyaviy amalni bajarganini kuzatish"
      />

      <form className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-5">
        <Select name="branchId" defaultValue={selectedBranchId} disabled={!isGlobalRole}>
          <option value="">Barcha filiallar</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </Select>
        <Select name="entityType" defaultValue={selectedEntityType}>
          <option value="">Barcha entitylar</option>
          {entityTypes.map((entity) => (
            <option key={entity.entityType} value={entity.entityType}>
              {entity.entityType}
            </option>
          ))}
        </Select>
        <Input type="date" name="from" defaultValue={from} />
        <Input type="date" name="to" defaultValue={to} />
        <button
          type="submit"
          className="h-10 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
        >
          Filtrlash
        </button>
      </form>

      {logs.length === 0 ? (
        <EmptyState message="Audit log yozuvlari topilmadi." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <Table>
            <thead>
              <tr>
                <TableHead>Vaqt</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Filial</TableHead>
                <TableHead>Foydalanuvchi</TableHead>
                <TableHead>Payload</TableHead>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <TableCell>{formatDate(log.createdAt)}</TableCell>
                  <TableCell>{log.action}</TableCell>
                  <TableCell>
                    <p>{log.entityType}</p>
                    <p className="text-xs text-slate-500">{log.entityId}</p>
                  </TableCell>
                  <TableCell>{log.branch?.name ?? "-"}</TableCell>
                  <TableCell>
                    {log.createdBy.firstName} {log.createdBy.lastName}
                  </TableCell>
                  <TableCell className="max-w-[320px]">
                    {log.payload ? (
                      <pre className="overflow-x-auto whitespace-pre-wrap break-words text-xs text-slate-600">
                        {JSON.stringify(log.payload, null, 2)}
                      </pre>
                    ) : (
                      "-"
                    )}
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
