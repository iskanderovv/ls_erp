import { NextRequest, NextResponse } from "next/server";
import { SubscriptionStatus } from "@prisma/client";
import { subDays } from "date-fns";

import { authorizeRequest } from "@/lib/auth/api";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request, "admin.panel");
  if (!auth.ok) return auth.response;

  const thirtyDaysAgo = subDays(new Date(), 30);

  const [totalOrganizations, activeSubscriptions, trialSubscriptions, newOrganizations, plans] =
    await Promise.all([
      prisma.organization.count(),
      prisma.subscription.count({ where: { status: SubscriptionStatus.ACTIVE } }),
      prisma.subscription.count({ where: { status: SubscriptionStatus.TRIAL } }),
      prisma.organization.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.plan.findMany({
        include: {
          subscriptions: {
            where: { status: SubscriptionStatus.ACTIVE },
            select: { id: true },
          },
        },
      }),
    ]);

  const mrrCents = plans.reduce((sum, plan) => sum + plan.priceCents * plan.subscriptions.length, 0);

  return NextResponse.json({
    totalOrganizations,
    activeSubscriptions,
    trialSubscriptions,
    newOrganizations,
    mrrCents,
  });
}
