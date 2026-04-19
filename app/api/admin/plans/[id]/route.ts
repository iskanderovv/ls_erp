import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { logSuperAdminAction } from "@/lib/admin/audit";
import { authorizeRequest } from "@/lib/auth/api";
import { prisma } from "@/lib/prisma";
import { planUpdateSchema } from "@/lib/validators/schemas";

type RouteParams = {
  params: Promise<{ id: string }>;
};

function parseFeatureFlags(input?: string) {
  if (!input) return undefined;
  try {
    const parsed = JSON.parse(input) as unknown;
    if (parsed && typeof parsed === "object") return parsed as Prisma.InputJsonValue;
  } catch {
    return undefined;
  }
  return undefined;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await authorizeRequest(request, "plans.manage");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = planUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Plan ma'lumotlari noto'g'ri." }, { status: 400 });
  }

  const data: Prisma.PlanUpdateInput = {};

  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.price !== undefined) data.priceCents = Math.round(parsed.data.price * 100);
  if (parsed.data.maxStudents !== undefined) {
    data.maxStudents =
      parsed.data.maxStudents === "" ? null : Number(parsed.data.maxStudents);
  }
  if (parsed.data.maxBranches !== undefined) {
    data.maxBranches =
      parsed.data.maxBranches === "" ? null : Number(parsed.data.maxBranches);
  }
  if (parsed.data.featureFlags !== undefined) {
    const parsedFlags = parsed.data.featureFlags
      ? parseFeatureFlags(parsed.data.featureFlags)
      : Prisma.JsonNull;
    data.featureFlags = parsedFlags ?? Prisma.JsonNull;
  }
  if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive;

  const plan = await prisma.plan.update({
    where: { id },
    data,
  });

  await logSuperAdminAction({
    action: "PLAN_UPDATED",
    entityType: "PLAN",
    entityId: plan.id,
    performedById: auth.session.userId,
    payload: parsed.data,
  });

  return NextResponse.json({ plan });
}
