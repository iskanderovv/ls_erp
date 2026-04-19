import { LeadStatus } from "@prisma/client";
import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { NextRequest, NextResponse } from "next/server";

import { authorizeRequest } from "@/lib/auth/api";
import { getBranchFilter } from "@/lib/auth/branch-scope";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request, "dashboard.view");
  if (!auth.ok) return auth.response;

  const branchFilter = getBranchFilter(auth.session);

  const months = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
      start: startOfMonth(date),
      end: endOfMonth(date),
      label: format(date, "MMM"),
    };
  }).reverse();

  const [monthlyGrowth, monthlyRevenue, leadStats] = await Promise.all([
    Promise.all(
      months.map(async (m) => {
        const count = await prisma.student.count({
          where: {
            ...branchFilter,
            createdAt: { gte: m.start, lte: m.end },
          },
        });
        return { name: m.label, count };
      }),
    ),
    Promise.all(
      months.map(async (m) => {
        const sum = await prisma.payment.aggregate({
          where: {
            ...branchFilter,
            paidAt: { gte: m.start, lte: m.end },
          },
          _sum: { amountCents: true },
        });
        return { name: m.label, amount: (sum._sum.amountCents ?? 0) / 100 };
      }),
    ),
    prisma.lead.groupBy({
      by: ["status"],
      where: branchFilter,
      _count: { _all: true },
    }),
  ]);

  const statusTranslations: Record<LeadStatus, string> = {
    [LeadStatus.NEW]: "Yangi",
    [LeadStatus.CONTACTED]: "Bog'lanilgan",
    [LeadStatus.TRIAL_LESSON]: "Sinov darsi",
    [LeadStatus.CONVERTED]: "Talabaga aylangan",
    [LeadStatus.LOST]: "Yo'qotilgan",
  };

  const leadDistribution = Object.values(LeadStatus).map((status) => {
    const stat = leadStats.find((s) => s.status === status);
    // @ts-expect-error Prisma aggregation types can be tricky
    return { name: statusTranslations[status], value: stat?._count?._all ?? 0 };
  });

  return NextResponse.json({
    monthlyGrowth,
    monthlyRevenue,
    leadDistribution,
  });
}
