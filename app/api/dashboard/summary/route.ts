import { GroupStatus, StudentFeeStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { authorizeRequest } from "@/lib/auth/api";
import { getBranchFilter } from "@/lib/auth/branch-scope";
import { hasPermission } from "@/lib/auth/permissions";
import { feeExpectedAmount } from "@/lib/debt";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request, "dashboard.view");
  if (!auth.ok) return auth.response;

  const branchFilter = getBranchFilter(auth.session);

  const [students, activeGroups, teachers, leads, recentStudents, recentLeads] =
    await Promise.all([
      prisma.student.count({ where: branchFilter }),
      prisma.studyGroup.count({ where: { ...branchFilter, status: GroupStatus.ACTIVE } }),
      prisma.teacher.count({ where: branchFilter }),
      prisma.lead.count({ where: branchFilter }),
      prisma.student.findMany({
        where: branchFilter,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.lead.findMany({
        where: branchFilter,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  let finance: {
    todayRevenueCents: number;
    monthRevenueCents: number;
    outstandingDebtCents: number;
  } | null = null;

  if (hasPermission(auth.session.role, "finance.view")) {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const monthEnd = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999),
    );

    const [todayRevenue, monthRevenue, activeFees] = await Promise.all([
      prisma.payment.aggregate({
        where: {
          ...branchFilter,
          paidAt: {
            gte: todayStart,
            lte: now,
          },
        },
        _sum: { amountCents: true },
      }),
      prisma.payment.aggregate({
        where: {
          ...branchFilter,
          paidAt: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
        _sum: { amountCents: true },
      }),
      prisma.studentFee.findMany({
        where: {
          status: StudentFeeStatus.ACTIVE,
          ...branchFilter,
        },
        select: {
          id: true,
          studentId: true,
          groupId: true,
          startDate: true,
          endDate: true,
          monthlyFeeCents: true,
        },
      }),
    ]);

    const debtParts = await Promise.all(
      activeFees.map(async (fee) => {
        const paid = await prisma.payment.aggregate({
          where: {
            studentId: fee.studentId,
            groupId: fee.groupId,
            paidAt: {
              gte: fee.startDate,
              lte: fee.endDate ?? now,
            },
          },
          _sum: { amountCents: true },
        });
        return Math.max(0, feeExpectedAmount(fee, now) - (paid._sum.amountCents ?? 0));
      }),
    );

    finance = {
      todayRevenueCents: todayRevenue._sum.amountCents ?? 0,
      monthRevenueCents: monthRevenue._sum.amountCents ?? 0,
      outstandingDebtCents: debtParts.reduce((sum, value) => sum + value, 0),
    };
  }

  return NextResponse.json({
    totals: {
      students,
      activeGroups,
      teachers,
      leads,
    },
    finance,
    recentStudents,
    recentLeads,
  });
}
