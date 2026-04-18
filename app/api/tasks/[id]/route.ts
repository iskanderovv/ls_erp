import { NextRequest, NextResponse } from "next/server";

import { authorizeRequest } from "@/lib/auth/api";
import { canAccessBranch } from "@/lib/auth/branch-scope";
import { hasPermission } from "@/lib/auth/permissions";
import { parseDateOnly } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { taskUpdateSchema } from "@/lib/validators/schemas";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await authorizeRequest(request, "tasks.view");
  if (!auth.ok) return auth.response;

  const canManage = hasPermission(auth.session.role, "tasks.manage");
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = taskUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Vazifa ma'lumotlari noto'g'ri." }, { status: 400 });
  }

  const task = await prisma.task.findUnique({
    where: { id },
    select: { id: true, branchId: true, assignedToId: true, status: true },
  });
  if (!task) {
    return NextResponse.json({ error: "Vazifa topilmadi." }, { status: 404 });
  }
  if (!canAccessBranch(auth.session, task.branchId)) {
    return NextResponse.json({ error: "Bu filial uchun ruxsat yo'q." }, { status: 403 });
  }
  if (!canManage && task.assignedToId !== auth.session.userId) {
    return NextResponse.json({ error: "Faqat o'zingizga biriktirilgan vazifani o'zgartira olasiz." }, { status: 403 });
  }

  if (!canManage) {
    const onlyStatus =
      parsed.data.status !== undefined &&
      parsed.data.title === undefined &&
      parsed.data.description === undefined &&
      parsed.data.assignedToId === undefined &&
      parsed.data.dueDate === undefined;
    if (!onlyStatus) {
      return NextResponse.json(
        { error: "Faqat statusni o'zgartirish mumkin." },
        { status: 403 },
      );
    }
  }

  const updated = await prisma.task.update({
    where: { id },
    data: {
      ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
      ...(parsed.data.description !== undefined
        ? { description: parsed.data.description?.trim() || null }
        : {}),
      ...(parsed.data.assignedToId !== undefined ? { assignedToId: parsed.data.assignedToId } : {}),
      ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
      ...(parsed.data.status !== undefined
        ? { completedAt: parsed.data.status === "DONE" ? new Date() : null }
        : {}),
      ...(parsed.data.dueDate !== undefined
        ? { dueDate: parsed.data.dueDate ? parseDateOnly(parsed.data.dueDate) : null }
        : {}),
    },
  });

  return NextResponse.json({ task: updated });
}
