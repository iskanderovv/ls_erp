import { LeadStatus } from "@prisma/client";
import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { NextRequest, NextResponse } from "next/server";

import { authorizeRequest } from "@/lib/auth/api";
import { canAccessBranch } from "@/lib/auth/branch-scope";
import { prisma } from "@/lib/prisma";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await authorizeRequest(request, "branches.view");
  if (!auth.ok) return auth.response;

  const { id } = await params;

  if (!canAccessBranch(auth.session, id)) {
    return NextResponse.json({ error: "Ruxsat yo'q." }, { status: 403 });
  }

  const branchFilter = { branchId: id, organizationId: auth.session.organizationId };

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
    return { name: statusTranslations[status], value: stat?._count?._all ?? 0 };
  });

  return NextResponse.json({
    monthlyGrowth,
    monthlyRevenue,
    leadDistribution,
  });
}
