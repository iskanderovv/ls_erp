import { NextRequest, NextResponse } from "next/server";
import { SubscriptionStatus } from "@prisma/client";

import { logSuperAdminAction } from "@/lib/admin/audit";
import { authorizeRequest } from "@/lib/auth/api";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request, "subscriptions.manage");
  if (!auth.ok) return auth.response;

  const subscriptions = await prisma.subscription.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      organization: {
        select: { id: true, name: true, status: true },
      },
      plan: true,
    },
  });

  return NextResponse.json({ subscriptions });
}

export async function POST(request: NextRequest) {
  const auth = await authorizeRequest(request, "subscriptions.manage");
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as
    | {
        organizationId?: string;
        planId?: string;
        status?: SubscriptionStatus;
        startDate?: string;
        endDate?: string;
      }
    | null;

  if (!body?.organizationId || !body.planId) {
    return NextResponse.json({ error: "organizationId va planId kerak." }, { status: 400 });
  }

  const subscription = await prisma.subscription.create({
    data: {
      organizationId: body.organizationId,
      planId: body.planId,
      status: body.status ?? SubscriptionStatus.ACTIVE,
      startDate: body.startDate ? new Date(body.startDate) : new Date(),
      endDate: body.endDate ? new Date(body.endDate) : null,
    },
    include: { organization: true, plan: true },
  });

  await prisma.organization.update({
    where: { id: subscription.organizationId },
    data: {
      subscriptionPlan: subscription.plan.code,
      subscriptionStatus: subscription.status,
    },
  });

  await logSuperAdminAction({
    action: "SUBSCRIPTION_CREATED",
    entityType: "SUBSCRIPTION",
    entityId: subscription.id,
    performedById: auth.session.userId,
    payload: {
      organizationId: subscription.organizationId,
      planId: subscription.planId,
      status: subscription.status,
    },
  });

  return NextResponse.json({ subscription }, { status: 201 });
}
