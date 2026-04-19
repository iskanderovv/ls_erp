import { NextRequest, NextResponse } from "next/server";
import { SubscriptionStatus } from "@prisma/client";

import { logSuperAdminAction } from "@/lib/admin/audit";
import { authorizeRequest } from "@/lib/auth/api";
import { prisma } from "@/lib/prisma";
import { subscriptionUpdateSchema } from "@/lib/validators/schemas";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await authorizeRequest(request, "subscriptions.manage");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = subscriptionUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Subscription ma'lumotlari noto'g'ri." }, { status: 400 });
  }

  const nextData: {
    planId?: string;
    status?: SubscriptionStatus;
    startDate?: Date;
    endDate?: Date | null;
  } = {};
  if (parsed.data.planId) nextData.planId = parsed.data.planId;
  if (parsed.data.status) nextData.status = parsed.data.status;
  if (parsed.data.startDate !== undefined && parsed.data.startDate !== "") {
    nextData.startDate = new Date(parsed.data.startDate);
  }
  if (parsed.data.endDate !== undefined) {
    nextData.endDate = parsed.data.endDate ? new Date(parsed.data.endDate) : null;
  }

  const subscription = await prisma.subscription.update({
    where: { id },
    data: nextData,
    include: { plan: true },
  });

  await prisma.organization.update({
    where: { id: subscription.organizationId },
    data: {
      subscriptionPlan: subscription.plan.code,
      subscriptionStatus: subscription.status,
    },
  });

  await logSuperAdminAction({
    action: "SUBSCRIPTION_UPDATED",
    entityType: "SUBSCRIPTION",
    entityId: subscription.id,
    performedById: auth.session.userId,
    payload: parsed.data,
  });

  return NextResponse.json({ subscription });
}
