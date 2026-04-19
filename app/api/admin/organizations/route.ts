import { NextRequest, NextResponse } from "next/server";
import { SubscriptionStatus } from "@prisma/client";

import { logSuperAdminAction } from "@/lib/admin/audit";
import { authorizeRequest } from "@/lib/auth/api";
import { prisma } from "@/lib/prisma";
import { organizationCreateSchema } from "@/lib/validators/schemas";

export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request, "organizations.manage");
  if (!auth.ok) return auth.response;

  const search = request.nextUrl.searchParams.get("search")?.trim();
  const status = request.nextUrl.searchParams.get("status");

  const [organizationsCount, usersCount, branchesCount, studentsCount, organizations] = await Promise.all([
    prisma.organization.count(),
    prisma.user.count(),
    prisma.branch.count(),
    prisma.student.count(),
    prisma.organization.findMany({
      where: {
        ...(search
          ? {
              OR: [{ name: { contains: search, mode: "insensitive" } }, { id: { contains: search } }],
            }
          : {}),
        ...(status ? { status: status as "ACTIVE" | "BLOCKED" | "INACTIVE" } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            status: true,
          },
        },
        subscriptions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { plan: true },
        },
        _count: {
          select: {
            users: true,
            branches: true,
            students: true,
            groups: true,
          },
        },
      },
    }),
  ]);

  return NextResponse.json({
    stats: {
      organizations: organizationsCount,
      users: usersCount,
      branches: branchesCount,
      students: studentsCount,
    },
    organizations,
  });
}

export async function POST(request: NextRequest) {
  const auth = await authorizeRequest(request, "organizations.manage");
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = organizationCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Organization ma'lumotlari noto'g'ri." }, { status: 400 });
  }

  const plan = await prisma.plan.findUnique({
    where: { code: parsed.data.subscriptionPlan },
  });
  if (!plan) {
    return NextResponse.json({ error: "Tanlangan plan topilmadi." }, { status: 400 });
  }

  const organization = await prisma.organization.create({
    data: {
      name: parsed.data.name,
      subscriptionPlan: parsed.data.subscriptionPlan,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      subscriptions: {
        create: {
          planId: plan.id,
          status: SubscriptionStatus.ACTIVE,
          startDate: new Date(),
        },
      },
    },
    include: {
      subscriptions: {
        include: { plan: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  await logSuperAdminAction({
    action: "ORGANIZATION_CREATED",
    entityType: "ORGANIZATION",
    entityId: organization.id,
    performedById: auth.session.userId,
    payload: {
      name: organization.name,
      subscriptionPlan: organization.subscriptionPlan,
    },
  });

  return NextResponse.json({ organization }, { status: 201 });
}
