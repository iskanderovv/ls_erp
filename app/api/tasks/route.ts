import { NextRequest, NextResponse } from "next/server";
import { TaskStatus } from "@prisma/client";

import { authorizeRequest } from "@/lib/auth/api";
import { canAccessBranch } from "@/lib/auth/branch-scope";
import { hasPermission } from "@/lib/auth/permissions";
import { parseDateOnly } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { taskCreateSchema } from "@/lib/validators/schemas";

export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request, "tasks.view");
  if (!auth.ok) return auth.response;

  const canManage = hasPermission(auth.session.role, "tasks.manage");
  const status = request.nextUrl.searchParams.get("status");
  const assignedTo = request.nextUrl.searchParams.get("assignedTo");
  const branchId = request.nextUrl.searchParams.get("branchId");

  if (branchId && !canAccessBranch(auth.session, branchId)) {
    return NextResponse.json({ error: "Bu filial uchun ruxsat yo'q." }, { status: 403 });
  }

  const statusFilter = status
    ? TaskStatus[status as keyof typeof TaskStatus] ?? null
    : null;
  if (status && !statusFilter) {
    return NextResponse.json({ error: "Status noto'g'ri." }, { status: 400 });
  }

  const rows = await prisma.task.findMany({
    where: {
      ...(branchId ? { branchId } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(canManage
        ? assignedTo === "me"
          ? { assignedToId: auth.session.userId }
          : assignedTo
            ? { assignedToId: assignedTo }
            : {}
        : { assignedToId: auth.session.userId }),
    },
    include: {
      assignedTo: {
        select: { firstName: true, lastName: true },
      },
      createdBy: {
        select: { firstName: true, lastName: true },
      },
      branch: {
        select: { name: true },
      },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    take: 300,
  });

  const scopedRows = rows.filter((row) => canAccessBranch(auth.session, row.branchId));
  return NextResponse.json({ rows: scopedRows });
}

export async function POST(request: NextRequest) {
  const auth = await authorizeRequest(request, "tasks.manage");
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = taskCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Vazifa ma'lumotlari noto'g'ri." }, { status: 400 });
  }

  if (!canAccessBranch(auth.session, parsed.data.branchId)) {
    return NextResponse.json({ error: "Bu filial uchun ruxsat yo'q." }, { status: 403 });
  }

  const assigned = await prisma.user.findUnique({
    where: { id: parsed.data.assignedToId },
    select: { id: true, branchId: true, status: true },
  });
  if (!assigned) {
    return NextResponse.json({ error: "Mas'ul xodim topilmadi." }, { status: 404 });
  }
  if (assigned.status !== "ACTIVE") {
    return NextResponse.json({ error: "Mas'ul xodim faol emas." }, { status: 400 });
  }
  if (assigned.branchId !== parsed.data.branchId) {
    return NextResponse.json({ error: "Xodim va vazifa filiallari mos emas." }, { status: 400 });
  }

  const task = await prisma.task.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description?.trim() || null,
      assignedToId: parsed.data.assignedToId,
      createdById: auth.session.userId,
      branchId: parsed.data.branchId,
      relatedEntityType: parsed.data.relatedEntityType || null,
      relatedEntityId: parsed.data.relatedEntityId?.trim() || null,
      dueDate: parsed.data.dueDate ? parseDateOnly(parsed.data.dueDate) : null,
    },
  });

  await prisma.notification.create({
    data: {
      userId: task.assignedToId,
      branchId: task.branchId,
      type: "TASK_DUE",
      title: "Yangi vazifa",
      message: task.title,
      link: "/dashboard/tasks",
      severity: "INFO",
    },
  });

  return NextResponse.json({ task });
}
