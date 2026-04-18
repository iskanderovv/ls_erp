import { NextRequest, NextResponse } from "next/server";

import { authorizeRequest } from "@/lib/auth/api";
import { canAccessBranch } from "@/lib/auth/branch-scope";
import { parseDateOnly } from "@/lib/date";
import { toCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { salaryConfigSchema } from "@/lib/validators/schemas";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await authorizeRequest(request, "salary.manage");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = salaryConfigSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Oylik sozlamasi ma'lumotlari noto'g'ri." }, { status: 400 });
  }

  const existing = await prisma.teacherSalaryConfig.findUnique({
    where: { id },
    include: {
      teacher: {
        select: { branchId: true },
      },
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "Oylik sozlamasi topilmadi." }, { status: 404 });
  }
  if (!canAccessBranch(auth.session, existing.teacher.branchId)) {
    return NextResponse.json({ error: "Bu filial uchun ruxsat yo'q." }, { status: 403 });
  }

  const teacher = await prisma.teacher.findUnique({
    where: { id: parsed.data.teacherId },
    select: { id: true, branchId: true },
  });
  if (!teacher) {
    return NextResponse.json({ error: "Ustoz topilmadi." }, { status: 404 });
  }
  if (!canAccessBranch(auth.session, teacher.branchId)) {
    return NextResponse.json({ error: "Bu filial uchun ruxsat yo'q." }, { status: 403 });
  }

  const effectiveFrom = parseDateOnly(parsed.data.effectiveFrom);
  const effectiveTo = parsed.data.effectiveTo ? parseDateOnly(parsed.data.effectiveTo) : null;
  if (effectiveTo && effectiveTo < effectiveFrom) {
    return NextResponse.json({ error: "Tugash sanasi noto'g'ri." }, { status: 400 });
  }

  const config = await prisma.$transaction(async (tx) => {
    if (parsed.data.isActive) {
      await tx.teacherSalaryConfig.updateMany({
        where: {
          teacherId: teacher.id,
          isActive: true,
          id: { not: id },
        },
        data: {
          isActive: false,
        },
      });
    }

    const updated = await tx.teacherSalaryConfig.update({
      where: { id },
      data: {
        teacherId: teacher.id,
        type: parsed.data.type,
        unitAmountCents:
          parsed.data.type === "PERCENTAGE" ? null : toCents(parsed.data.unitAmount ?? 0),
        percentageBps:
          parsed.data.type === "PERCENTAGE"
            ? Math.round((parsed.data.percentage ?? 0) * 100)
            : null,
        isActive: parsed.data.isActive,
        effectiveFrom,
        effectiveTo,
      },
    });

    await tx.auditLog.create({
      data: {
        action: "SALARY_CONFIG_UPDATED",
        entityType: "TEACHER_SALARY_CONFIG",
        entityId: updated.id,
        branchId: teacher.branchId,
        createdById: auth.session.userId,
      },
    });

    return updated;
  });

  return NextResponse.json({ config });
}
