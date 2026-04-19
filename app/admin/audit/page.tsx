import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableCell, TableHead } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export default async function AdminAuditPage() {
  const logs = await prisma.superAdminAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      performedBy: {
        select: {
          firstName: true,
          lastName: true,
          phone: true,
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Global audit logs</h1>
        <p className="mt-1 text-sm text-slate-500">
          Super admin darajasidagi organization, plan va subscription amallari jurnali.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Audit trail</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <Table>
              <thead>
                <tr>
                  <TableHead>Vaqt</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Entity ID</TableHead>
                  <TableHead>By</TableHead>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <TableCell>{formatDate(log.createdAt)}</TableCell>
                    <TableCell>{log.action}</TableCell>
                    <TableCell>{log.entityType}</TableCell>
                    <TableCell className="max-w-[260px] truncate">{log.entityId ?? "-"}</TableCell>
                    <TableCell>
                      {log.performedBy.firstName} {log.performedBy.lastName}
                    </TableCell>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
