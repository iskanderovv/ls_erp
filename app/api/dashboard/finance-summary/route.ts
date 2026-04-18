import { ExpenseCategory, PaymentMethod, StudentFeeStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { authorizeRequest } from "@/lib/auth/api";
import { scopedBranchId } from "@/lib/auth/branch-scope";
import { feeExpectedAmount } from "@/lib/debt";
import { endOfMonth, startOfMonth } from "@/lib/date";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request, "finance.view");
  if (!auth.ok) return auth.response;

  const branchId = scopedBranchId(auth.session);
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const [
    todayRevenueAgg,
    monthRevenueAgg,
    monthExpenseAgg,
    monthSalaryAgg,
    methodGroups,
    topGroupAggregates,
    activeFees,
    expenseByCategory,
  ] =
    await Promise.all([
      prisma.payment.aggregate({
        where: {
          ...(branchId ? { branchId } : {}),
          paidAt: { gte: todayStart, lte: now },
        },
        _sum: { amountCents: true },
      }),
      prisma.payment.aggregate({
        where: {
          ...(branchId ? { branchId } : {}),
          paidAt: { gte: monthStart, lte: monthEnd },
        },
        _sum: { amountCents: true },
      }),
      prisma.expense.aggregate({
        where: {
          ...(branchId ? { branchId } : {}),
          status: "ACTIVE",
          paidAt: { gte: monthStart, lte: monthEnd },
        },
        _sum: { amountCents: true },
      }),
      prisma.salaryPayment.aggregate({
        where: {
          ...(branchId ? { branchId } : {}),
          paidAt: { gte: monthStart, lte: monthEnd },
        },
        _sum: { amountCents: true },
      }),
      prisma.payment.groupBy({
        by: ["paymentMethod"],
        where: {
          ...(branchId ? { branchId } : {}),
          paidAt: { gte: monthStart, lte: monthEnd },
        },
        _sum: { amountCents: true },
      }),
      prisma.payment.groupBy({
        by: ["groupId"],
        where: {
          ...(branchId ? { branchId } : {}),
          groupId: { not: null },
          paidAt: { gte: monthStart, lte: monthEnd },
        },
        _sum: { amountCents: true },
        orderBy: {
          _sum: { amountCents: "desc" },
        },
        take: 5,
      }),
      prisma.studentFee.findMany({
        where: {
          status: StudentFeeStatus.ACTIVE,
          ...(branchId ? { branchId } : {}),
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
      prisma.expense.groupBy({
        by: ["category"],
        where: {
          ...(branchId ? { branchId } : {}),
          status: "ACTIVE",
          paidAt: { gte: monthStart, lte: monthEnd },
        },
        _sum: { amountCents: true },
      }),
    ]);

  const topGroupIds = topGroupAggregates
    .map((item) => item.groupId)
    .filter((value): value is string => Boolean(value));
  const groups = await prisma.studyGroup.findMany({
    where: {
      id: {
        in: topGroupIds,
      },
    },
    select: {
      id: true,
      name: true,
    },
  });
  const groupMap = new Map(groups.map((group) => [group.id, group.name]));

  const outstanding = await Promise.all(
    activeFees.map(async (fee) => {
      const expected = feeExpectedAmount(fee, now);
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
      return Math.max(0, expected - (paid._sum.amountCents ?? 0));
    }),
  );

  const paymentMethodTotals: Record<PaymentMethod, number> = {
    CASH: 0,
    CARD: 0,
    CLICK: 0,
    PAYME: 0,
    OTHER: 0,
  };
  for (const row of methodGroups) {
    paymentMethodTotals[row.paymentMethod] = row._sum.amountCents ?? 0;
  }

  const expenseCategoryTotals: Record<ExpenseCategory, number> = {
    RENT: 0,
    SALARY: 0,
    MARKETING: 0,
    UTILITIES: 0,
    EQUIPMENT: 0,
    OTHER: 0,
  };
  for (const row of expenseByCategory) {
    expenseCategoryTotals[row.category] = row._sum.amountCents ?? 0;
  }
  const highestExpenseCategory = Object.entries(expenseCategoryTotals).sort((a, b) => b[1] - a[1])[0] ?? [
    "OTHER",
    0,
  ];

  const monthRevenueCents = monthRevenueAgg._sum.amountCents ?? 0;
  const monthExpenseCents = monthExpenseAgg._sum.amountCents ?? 0;
  const monthSalaryCents = monthSalaryAgg._sum.amountCents ?? 0;
  const monthProfitCents = monthRevenueCents - monthExpenseCents - monthSalaryCents;

  return NextResponse.json({
    todayRevenueCents: todayRevenueAgg._sum.amountCents ?? 0,
    monthRevenueCents,
    monthExpenseCents,
    monthSalaryCents,
    monthProfitCents,
    outstandingDebtCents: outstanding.reduce((sum, value) => sum + value, 0),
    paymentMethodTotals,
    expenseCategoryTotals,
    insights: {
      highestExpenseCategory: {
        category: highestExpenseCategory[0],
        amountCents: highestExpenseCategory[1],
      },
    },
    topPayingGroups: topGroupAggregates.map((item) => ({
      groupId: item.groupId,
      groupName: item.groupId ? groupMap.get(item.groupId) ?? "Noma'lum guruh" : "Noma'lum",
      amountCents: item._sum.amountCents ?? 0,
    })),
  });
}
