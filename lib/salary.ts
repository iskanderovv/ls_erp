import { GroupStatus, Prisma, SalaryType } from "@prisma/client";

import { endOfMonth, startOfMonth } from "@/lib/date";

export async function calculateTeacherSalary(
  tx: Prisma.TransactionClient,
  teacherId: string,
  periodYear: number,
  periodMonth: number,
) {
  const periodStart = startOfMonth(new Date(Date.UTC(periodYear, periodMonth - 1, 1)));
  const periodEnd = endOfMonth(periodStart);

  const teacher = await tx.teacher.findUnique({
    where: { id: teacherId },
    select: {
      id: true,
      branchId: true,
      firstName: true,
      lastName: true,
    },
  });
  if (!teacher) {
    throw new Error("Ustoz topilmadi.");
  }

  const config = await tx.teacherSalaryConfig.findFirst({
    where: {
      teacherId,
      isActive: true,
      effectiveFrom: {
        lte: periodEnd,
      },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: periodStart } }],
    },
    orderBy: [{ effectiveFrom: "desc" }, { createdAt: "desc" }],
  });

  if (!config) {
    return {
      teacher,
      config: null,
      calculatedAmountCents: 0,
      breakdown: {
        reason: "Faol oylik sozlamasi topilmadi.",
      },
    };
  }

  const baseGroups = await tx.studyGroup.findMany({
    where: {
      teacherId,
      startDate: { lte: periodEnd },
      status: {
        in: [GroupStatus.FORMING, GroupStatus.ACTIVE, GroupStatus.COMPLETED],
      },
    },
    select: { id: true, name: true },
  });

  const groupIds = baseGroups.map((group) => group.id);

  let calculatedAmountCents = 0;
  let breakdown: Record<string, unknown> = {};

  if (config.type === SalaryType.FIXED) {
    calculatedAmountCents = config.unitAmountCents ?? 0;
    breakdown = {
      type: config.type,
      fixedAmountCents: config.unitAmountCents ?? 0,
    };
  } else if (config.type === SalaryType.PER_GROUP) {
    const unit = config.unitAmountCents ?? 0;
    const groupCount = baseGroups.length;
    calculatedAmountCents = unit * groupCount;
    breakdown = {
      type: config.type,
      unitAmountCents: unit,
      groupCount,
      groupIds,
    };
  } else if (config.type === SalaryType.PER_STUDENT) {
    const unit = config.unitAmountCents ?? 0;
    const students = groupIds.length
      ? await tx.groupStudent.findMany({
          where: {
            groupId: { in: groupIds },
            joinedAt: { lte: periodEnd },
          },
          distinct: ["studentId"],
          select: { studentId: true },
        })
      : [];
    const studentCount = students.length;
    calculatedAmountCents = unit * studentCount;
    breakdown = {
      type: config.type,
      unitAmountCents: unit,
      studentCount,
      groupIds,
    };
  } else if (config.type === SalaryType.PERCENTAGE) {
    const percentageBps = config.percentageBps ?? 0;
    const payments = await tx.payment.aggregate({
      where: {
        ...(groupIds.length ? { groupId: { in: groupIds } } : { id: "__none__" }),
        paidAt: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      _sum: { amountCents: true },
    });
    const revenueCents = payments._sum.amountCents ?? 0;
    calculatedAmountCents = Math.floor((revenueCents * percentageBps) / 10_000);
    breakdown = {
      type: config.type,
      percentageBps,
      revenueCents,
      groupIds,
    };
  }

  return {
    teacher,
    config,
    calculatedAmountCents,
    breakdown,
  };
}
