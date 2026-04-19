import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { logSuperAdminAction } from "@/lib/admin/audit";
import { authorizeRequest } from "@/lib/auth/api";
import { prisma } from "@/lib/prisma";
import { planCreateSchema } from "@/lib/validators/schemas";

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

export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request, "plans.manage");
  if (!auth.ok) return auth.response;

  const plans = await prisma.plan.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: {
        select: { subscriptions: true },
      },
    },
  });

  return NextResponse.json({ plans });
}

export async function POST(request: NextRequest) {
  const auth = await authorizeRequest(request, "plans.manage");
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = planCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Plan ma'lumotlari noto'g'ri." }, { status: 400 });
  }

  const featureFlags = parseFeatureFlags(parsed.data.featureFlags || undefined);

  const plan = await prisma.plan.upsert({
    where: { code: parsed.data.code },
    create: {
      name: parsed.data.name,
      code: parsed.data.code,
      priceCents: Math.round(parsed.data.price * 100),
      maxStudents:
        parsed.data.maxStudents === "" || parsed.data.maxStudents === undefined
          ? null
          : Number(parsed.data.maxStudents),
      maxBranches:
        parsed.data.maxBranches === "" || parsed.data.maxBranches === undefined
          ? null
          : Number(parsed.data.maxBranches),
      ...(featureFlags !== undefined ? { featureFlags } : {}),
    },
    update: {
      name: parsed.data.name,
      priceCents: Math.round(parsed.data.price * 100),
      maxStudents:
        parsed.data.maxStudents === "" || parsed.data.maxStudents === undefined
          ? null
          : Number(parsed.data.maxStudents),
      maxBranches:
        parsed.data.maxBranches === "" || parsed.data.maxBranches === undefined
          ? null
          : Number(parsed.data.maxBranches),
      ...(featureFlags !== undefined ? { featureFlags } : {}),
      isActive: true,
    },
  });

  await logSuperAdminAction({
    action: "PLAN_UPSERTED",
    entityType: "PLAN",
    entityId: plan.id,
    performedById: auth.session.userId,
    payload: parsed.data,
  });

  return NextResponse.json({ plan }, { status: 201 });
}
