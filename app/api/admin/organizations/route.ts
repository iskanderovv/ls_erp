import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Role, SubscriptionStatus, UserStatus } from "@prisma/client";

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
    return NextResponse.json({ error: "Tashkilot ma'lumotlari noto'g'ri." }, { status: 400 });
  }

  const existingUser = await prisma.user.findUnique({
    where: { phone: parsed.data.ownerPhone },
    select: { id: true },
  });
  if (existingUser) {
    return NextResponse.json({ error: "Bu telefon raqami allaqachon ro'yxatdan o'tgan." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.ownerPassword, 12);

  const organization = await prisma.organization.create({
    data: {
      name: parsed.data.name,
      subscriptionPlan: parsed.data.subscriptionPlan,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
    },
  });

  const ownerUser = await prisma.user.create({
    data: {
      organizationId: organization.id,
      firstName: parsed.data.name,
      lastName: "Admin",
      phone: parsed.data.ownerPhone,
      passwordHash,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.organization.update({
    where: { id: organization.id },
    data: { ownerId: ownerUser.id },
  });

  const prismaCompat = prisma as typeof prisma & {
    plan?: { findUnique: (args: { where: { code: "BASIC" | "PRO" | "ENTERPRISE" } }) => Promise<{ id: string } | null> };
    subscription?: {
      create: (args: {
        data: {
          organizationId: string;
          planId: string;
          status: SubscriptionStatus;
          startDate: Date;
        };
      }) => Promise<unknown>;
    };
  };

  if (prismaCompat.plan && prismaCompat.subscription) {
    const plan = await prismaCompat.plan.findUnique({
      where: { code: parsed.data.subscriptionPlan },
    });
    if (plan) {
      await prismaCompat.subscription.create({
        data: {
          organizationId: organization.id,
          planId: plan.id,
          status: SubscriptionStatus.ACTIVE,
          startDate: new Date(),
        },
      });
    }
  }

  await logSuperAdminAction({
    action: "ORGANIZATION_CREATED",
    entityType: "ORGANIZATION",
    entityId: organization.id,
    performedById: auth.session.userId,
    payload: {
      name: organization.name,
      subscriptionPlan: organization.subscriptionPlan,
      ownerUserId: ownerUser.id,
      ownerPhone: ownerUser.phone,
    },
  });

  return NextResponse.json({ organization, ownerUser }, { status: 201 });
}
