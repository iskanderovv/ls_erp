import { NextRequest, NextResponse } from "next/server";

import { authorizeRequest } from "@/lib/auth/api";
import { canAccessBranch } from "@/lib/auth/branch-scope";
import { parseDateOnly } from "@/lib/date";
import { toCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { salaryConfigSchema } from "@/lib/validators/schemas";

export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request, "salary.view");
  if (!auth.ok) return auth.response;

  const teacherId = request.nextUrl.searchParams.get("teacherId");
  const rows = await prisma.teacherSalaryConfig.findMany({
    where: {
      ...(teacherId ? { teacherId } : {}),
    },
    include: {
      teacher: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          branchId: true,
        },
      },
    },
    orderBy: [{ effectiveFrom: "desc" }, { createdAt: "desc" }],
    take: 300,
  });

  const scopedRows = rows.filter((row) => canAccessBranch(auth.session, row.teacher.branchId));
  return NextResponse.json({ rows: scopedRows });
}

export async function POST(request: NextRequest) {
  const auth = await authorizeRequest(request, "salary.manage");
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = salaryConfigSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Oylik sozlamasi ma'lumotlari noto'g'ri." }, { status: 400 });
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
        },
        data: {
          isActive: false,
        },
      });
    }

    const created = await tx.teacherSalaryConfig.create({
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
        organizationId: auth.session.organizationId,
        action: "SALARY_CONFIG_CREATED",
        entityType: "TEACHER_SALARY_CONFIG",
        entityId: created.id,
        branchId: teacher.branchId,
        createdById: auth.session.userId,
        payload: {
          type: created.type,
          unitAmountCents: created.unitAmountCents,
          percentageBps: created.percentageBps,
        },
      },
    });

    return created;
  });

  return NextResponse.json({ config });
}
