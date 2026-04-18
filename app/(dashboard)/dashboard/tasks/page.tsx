import { TaskStatus, UserStatus } from "@prisma/client";

import { TaskForm } from "@/components/forms/task-form";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
import { Table, TableCell, TableHead } from "@/components/ui/table";
import { TaskStatusAction } from "@/components/tasks/task-status-action";
import { hasPermission } from "@/lib/auth/permissions";
import { requirePagePermission } from "@/lib/auth/session";
import { taskEntityTypeLabels, taskStatusLabels } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { searchValue } from "@/lib/search-params";
import { formatDate } from "@/lib/utils";

type SearchParams = Promise<{
  status?: string;
  assignedTo?: string;
  branchId?: string;
}>;

export default async function TasksPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requirePagePermission("tasks.view");
  const canManage = hasPermission(session.role, "tasks.manage");
  const isGlobalRole = session.role === "SUPER_ADMIN" || session.role === "ADMIN";
  const scopedBranchId = session.branchId ?? "__none__";

  const params = await searchParams;
  const selectedStatus = searchValue(params.status);
  const selectedAssignedTo = searchValue(params.assignedTo) || "me";
  const selectedBranchId = searchValue(params.branchId);
  const branchId = isGlobalRole ? selectedBranchId || null : scopedBranchId;

  const taskStatus = selectedStatus
    ? TaskStatus[selectedStatus as keyof typeof TaskStatus] ?? null
    : null;

  const [branches, assignees, tasks] = await Promise.all([
    prisma.branch.findMany({
      where: isGlobalRole ? undefined : { id: scopedBranchId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: {
        ...(branchId ? { branchId } : {}),
        status: UserStatus.ACTIVE,
      },
      select: { id: true, firstName: true, lastName: true, branchId: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
    prisma.task.findMany({
      where: {
        ...(branchId ? { branchId } : {}),
        ...(taskStatus ? { status: taskStatus } : {}),
        ...(canManage
          ? selectedAssignedTo === "me"
            ? { assignedToId: session.userId }
            : selectedAssignedTo
              ? { assignedToId: selectedAssignedTo }
              : {}
          : { assignedToId: session.userId }),
      },
      include: {
        assignedTo: { select: { firstName: true, lastName: true } },
        createdBy: { select: { firstName: true, lastName: true } },
        branch: { select: { name: true } },
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      take: 300,
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vazifalar"
        description="Follow-up va operatsion ishlarni boshqarish"
      />

      <form className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-4">
        <Select name="status" defaultValue={selectedStatus}>
          <option value="">Barcha statuslar</option>
          <option value="TODO">Yangi</option>
          <option value="IN_PROGRESS">Jarayonda</option>
          <option value="DONE">Bajarilgan</option>
          <option value="CANCELLED">Bekor qilingan</option>
        </Select>
        <Select name="assignedTo" defaultValue={selectedAssignedTo} disabled={!canManage}>
          <option value="me">Menga biriktirilgan</option>
          {assignees.map((assignee) => (
            <option key={assignee.id} value={assignee.id}>
              {assignee.firstName} {assignee.lastName}
            </option>
          ))}
        </Select>
        <Select name="branchId" defaultValue={selectedBranchId} disabled={!isGlobalRole}>
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

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Yangi vazifa</CardTitle>
          </CardHeader>
          <CardContent>
            <TaskForm
              assignees={assignees.map((item) => ({
                id: item.id,
                name: `${item.firstName} ${item.lastName}`,
                branchId: item.branchId ?? "",
              }))}
              branches={branches}
              defaultBranchId={branchId ?? undefined}
            />
          </CardContent>
        </Card>
      ) : null}

      {tasks.length === 0 ? (
        <EmptyState message="Vazifalar topilmadi." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <Table>
            <thead>
              <tr>
                <TableHead>Sarlavha</TableHead>
                <TableHead>Mas'ul</TableHead>
                <TableHead>Filial</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Muddat</TableHead>
                <TableHead>Yaratgan</TableHead>
                <TableHead className="w-[140px]">Amal</TableHead>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  <TableCell>
                    <p className="font-medium">{task.title}</p>
                    {task.description ? <p className="text-xs text-slate-500">{task.description}</p> : null}
                  </TableCell>
                  <TableCell>
                    {task.assignedTo.firstName} {task.assignedTo.lastName}
                  </TableCell>
                  <TableCell>{task.branch.name}</TableCell>
                  <TableCell>{taskStatusLabels[task.status]}</TableCell>
                  <TableCell>
                    {task.relatedEntityType
                      ? `${taskEntityTypeLabels[task.relatedEntityType]}${task.relatedEntityId ? ` • ${task.relatedEntityId}` : ""}`
                      : "-"}
                  </TableCell>
                  <TableCell>{task.dueDate ? formatDate(task.dueDate) : "-"}</TableCell>
                  <TableCell>
                    {task.createdBy ? `${task.createdBy.firstName} ${task.createdBy.lastName}` : "-"}
                  </TableCell>
                  <TableCell>
                    <TaskStatusAction taskId={task.id} currentStatus={task.status} />
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
