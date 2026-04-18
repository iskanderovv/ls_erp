import { AttendanceStatus, GroupStatus } from "@prisma/client";
import { subDays } from "date-fns";
import { NextRequest, NextResponse } from "next/server";

import { authorizeRequest } from "@/lib/auth/api";
import { getBranchFilter } from "@/lib/auth/branch-scope";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request, "dashboard.view");
  if (!auth.ok) return auth.response;

  const branchFilter = getBranchFilter(auth.session);
  const thirtyDaysAgo = subDays(new Date(), 30);

  // 1. Churn Risk: Students with > 3 absences in last 30 days
  const absences = await prisma.attendance.groupBy({
    by: ["studentId"],
    where: {
      ...branchFilter,
      status: AttendanceStatus.ABSENT,
      date: { gte: thirtyDaysAgo },
    },
    _count: { _all: true },
    having: {
      studentId: { _count: { gt: 3 } },
    },
  });

  const churnRiskStudents = await prisma.student.findMany({
    where: {
      id: { in: absences.map((a) => a.studentId) },
    },
    select: { id: true, firstName: true, lastName: true },
  });

  // 2. High-Value Students: Students with most payments in last 90 days
  const ninetyDaysAgo = subDays(new Date(), 90);
  const topPayments = await prisma.payment.groupBy({
    by: ["studentId"],
    where: {
      ...branchFilter,
      paidAt: { gte: ninetyDaysAgo },
    },
    _sum: { amountCents: true },
    orderBy: { _sum: { amountCents: "desc" } },
    take: 5,
  });

  const highValueStudents = await prisma.student.findMany({
    where: {
      id: { in: topPayments.map((p) => p.studentId) },
    },
    select: { id: true, firstName: true, lastName: true },
  });

  // 3. Weak Groups: Groups with < 5 students
  const weakGroups = await prisma.studyGroup.findMany({
    where: {
      ...branchFilter,
      status: GroupStatus.ACTIVE,
    },
    include: {
      _count: { select: { students: true } },
    },
  });

  const filteredWeakGroups = weakGroups
    .filter((g) => g._count.students < 5)
    .map((g) => ({ id: g.id, name: g.name, count: g._count.students }));

  return NextResponse.json({
    churnRisk: churnRiskStudents.map((s) => ({ ...s, reason: "Ko'p dars qoldirgan" })),
    highValue: highValueStudents,
    weakGroups: filteredWeakGroups,
  });
}
