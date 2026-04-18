import { ExpenseCategory } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { authorizeRequest } from "@/lib/auth/api";
import { canAccessBranch } from "@/lib/auth/branch-scope";
import { endOfMonth, startOfMonth } from "@/lib/date";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request, "reports.view");
  if (!auth.ok) return auth.response;

  const now = new Date();
  const periodYearParam = request.nextUrl.searchParams.get("periodYear");
  const periodMonthParam = request.nextUrl.searchParams.get("periodMonth");
  const branchId = request.nextUrl.searchParams.get("branchId");

  const periodYear = periodYearParam ? Number(periodYearParam) : now.getUTCFullYear();
  const periodMonth = periodMonthParam ? Number(periodMonthParam) : now.getUTCMonth() + 1;
  if (periodMonth < 1 || periodMonth > 12) {
    return NextResponse.json({ error: "Oy noto'g'ri." }, { status: 400 });
  }
  if (branchId && !canAccessBranch(auth.session, branchId)) {
    return NextResponse.json({ error: "Bu filial uchun ruxsat yo'q." }, { status: 403 });
  }

  const periodStart = startOfMonth(new Date(Date.UTC(periodYear, periodMonth - 1, 1)));
  const periodEnd = endOfMonth(periodStart);

  const [revenueAgg, expenseAgg, salaryAgg, expenseByCategory, groupRevenueRows, teacherCostRows] =
    await Promise.all([
      prisma.payment.aggregate({
        where: {
          ...(branchId ? { branchId } : {}),
          paidAt: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
        _sum: { amountCents: true },
      }),
      prisma.expense.aggregate({
        where: {
          ...(branchId ? { branchId } : {}),
          status: "ACTIVE",
          paidAt: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
        _sum: { amountCents: true },
      }),
      prisma.salaryPayment.aggregate({
        where: {
          ...(branchId ? { branchId } : {}),
          paidAt: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
        _sum: { amountCents: true },
      }),
      prisma.expense.groupBy({
        by: ["category"],
        where: {
          ...(branchId ? { branchId } : {}),
          status: "ACTIVE",
          paidAt: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
        _sum: { amountCents: true },
      }),
      prisma.payment.groupBy({
        by: ["groupId"],
        where: {
          ...(branchId ? { branchId } : {}),
          groupId: { not: null },
          paidAt: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
        _sum: { amountCents: true },
        orderBy: {
          _sum: { amountCents: "desc" },
        },
        take: 5,
      }),
      prisma.salaryPayment.groupBy({
        by: ["teacherId"],
        where: {
          ...(branchId ? { branchId } : {}),
          paidAt: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
        _sum: { amountCents: true },
      }),
    ]);

  const revenueCents = revenueAgg._sum.amountCents ?? 0;
  const expenseCents = expenseAgg._sum.amountCents ?? 0;
  const salaryCents = salaryAgg._sum.amountCents ?? 0;
  const netProfitCents = revenueCents - expenseCents - salaryCents;

  const categories: Record<ExpenseCategory, number> = {
    RENT: 0,
    SALARY: 0,
    MARKETING: 0,
    UTILITIES: 0,
    EQUIPMENT: 0,
    OTHER: 0,
  };
  for (const row of expenseByCategory) {
    categories[row.category] = row._sum.amountCents ?? 0;
  }

  const highestExpenseCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0] ?? [
    "OTHER",
    0,
  ];

  const groupIds = groupRevenueRows
    .map((row) => row.groupId)
    .filter((value): value is string => Boolean(value));
  const groups = await prisma.studyGroup.findMany({
    where: { id: { in: groupIds } },
    select: { id: true, name: true, teacherId: true },
  });
  const groupMap = new Map(groups.map((group) => [group.id, group]));

  const mostProfitableGroup = groupRevenueRows[0]
    ? {
        groupId: groupRevenueRows[0].groupId,
        groupName: groupRevenueRows[0].groupId
          ? groupMap.get(groupRevenueRows[0].groupId)?.name ?? "Noma'lum"
          : "Noma'lum",
        revenueCents: groupRevenueRows[0]._sum.amountCents ?? 0,
      }
    : null;

  const teacherRevenueMap = new Map<string, number>();
  for (const row of groupRevenueRows) {
    const group = row.groupId ? groupMap.get(row.groupId) : null;
    if (!group?.teacherId) continue;
    teacherRevenueMap.set(
      group.teacherId,
      (teacherRevenueMap.get(group.teacherId) ?? 0) + (row._sum.amountCents ?? 0),
    );
  }

  const teacherIds = teacherCostRows.map((row) => row.teacherId);
  const teachers = await prisma.teacher.findMany({
    where: { id: { in: teacherIds } },
    select: { id: true, firstName: true, lastName: true },
  });
  const teacherMap = new Map(teachers.map((teacher) => [teacher.id, teacher]));

  const teacherCostVsRevenue = teacherCostRows.map((row) => {
    const teacher = teacherMap.get(row.teacherId);
    const teacherRevenue = teacherRevenueMap.get(row.teacherId) ?? 0;
    const salaryCost = row._sum.amountCents ?? 0;
    return {
      teacherId: row.teacherId,
      teacherName: teacher ? `${teacher.firstName} ${teacher.lastName}` : "Noma'lum ustoz",
      revenueCents: teacherRevenue,
      salaryCostCents: salaryCost,
      marginCents: teacherRevenue - salaryCost,
    };
  });

  return NextResponse.json({
    periodYear,
    periodMonth,
    revenueCents,
    expenseCents,
    salaryCents,
    netProfitCents,
    expenseByCategory: categories,
    insights: {
      highestExpenseCategory: {
        category: highestExpenseCategory[0],
        amountCents: highestExpenseCategory[1],
      },
      mostProfitableGroup,
      teacherCostVsRevenue,
    },
  });
}
