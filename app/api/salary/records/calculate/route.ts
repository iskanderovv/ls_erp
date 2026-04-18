import { NextRequest, NextResponse } from "next/server";

import { authorizeRequest } from "@/lib/auth/api";
import { canAccessBranch } from "@/lib/auth/branch-scope";
import { prisma } from "@/lib/prisma";
import { calculateTeacherSalary } from "@/lib/salary";
import { salaryCalculateSchema } from "@/lib/validators/schemas";

export async function POST(request: NextRequest) {
  const auth = await authorizeRequest(request, "salary.manage");
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = salaryCalculateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Hisoblash parametrlari noto'g'ri." }, { status: 400 });
  }

  const teacherId = parsed.data.teacherId?.trim() || null;
  const branchId = parsed.data.branchId?.trim() || null;

  if (branchId && !canAccessBranch(auth.session, branchId)) {
    return NextResponse.json({ error: "Bu filial uchun ruxsat yo'q." }, { status: 403 });
  }

  const teachers = await prisma.teacher.findMany({
    where: {
      ...(teacherId ? { id: teacherId } : {}),
      ...(branchId ? { branchId } : {}),
    },
    select: { id: true, branchId: true },
  });

  const scopedTeachers = teachers.filter((teacher) => canAccessBranch(auth.session, teacher.branchId));
  if (!scopedTeachers.length) {
    return NextResponse.json({ rows: [] });
  }

  const rows = await Promise.all(
    scopedTeachers.map((teacher) =>
      prisma.$transaction(async (tx) => {
        const result = await calculateTeacherSalary(
          tx,
          teacher.id,
          parsed.data.periodYear,
          parsed.data.periodMonth,
        );

        const record = await tx.salaryRecord.upsert({
          where: {
            teacherId_periodMonth_periodYear: {
              teacherId: teacher.id,
              periodMonth: parsed.data.periodMonth,
              periodYear: parsed.data.periodYear,
            },
          },
          create: {
            teacherId: teacher.id,
            branchId: result.teacher.branchId,
            periodMonth: parsed.data.periodMonth,
            periodYear: parsed.data.periodYear,
            calculatedAmountCents: result.calculatedAmountCents,
            breakdown: result.breakdown,
          },
          update: {
            ...(result.config
              ? {
                  calculatedAmountCents: result.calculatedAmountCents,
                  breakdown: result.breakdown,
                }
              : {}),
          },
        });

        await tx.auditLog.create({
          data: {
            action: "SALARY_CALCULATED",
            entityType: "SALARY_RECORD",
            entityId: record.id,
            branchId: result.teacher.branchId,
            createdById: auth.session.userId,
            payload: {
              periodYear: parsed.data.periodYear,
              periodMonth: parsed.data.periodMonth,
              calculatedAmountCents: result.calculatedAmountCents,
              configType: result.config?.type ?? null,
            },
          },
        });

        return {
          record,
          teacherName: `${result.teacher.firstName} ${result.teacher.lastName}`,
        };
      }),
    ),
  );

  return NextResponse.json({ rows });
}
