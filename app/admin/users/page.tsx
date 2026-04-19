import { Role } from "@prisma/client";

import { OwnerStatusAction } from "@/components/admin/owner-status-action";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableCell, TableHead } from "@/components/ui/table";
import { roleLabels } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    where: {
      role: {
        in: [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER],
      },
    },
    include: {
      organization: {
        select: { id: true, name: true, status: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Global user management</h1>
        <p className="mt-1 text-sm text-slate-500">Asosiy userlar (owner/admin/manager) holatini nazorat qilish.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Key users</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <Table>
              <thead>
                <tr>
                  <TableHead>F.I.O</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Action</TableHead>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <TableCell>
                      {user.firstName} {user.lastName}
                    </TableCell>
                    <TableCell>{user.phone}</TableCell>
                    <TableCell>{roleLabels[user.role]}</TableCell>
                    <TableCell>{user.organization.name}</TableCell>
                    <TableCell>{user.status}</TableCell>
                    <TableCell>{formatDate(user.createdAt)}</TableCell>
                    <TableCell>
                      <OwnerStatusAction userId={user.id} currentStatus={user.status} />
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
