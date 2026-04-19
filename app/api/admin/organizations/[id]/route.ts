import { NextRequest, NextResponse } from "next/server";
import { SubscriptionStatus } from "@prisma/client";

import { logSuperAdminAction } from "@/lib/admin/audit";
import { authorizeRequest } from "@/lib/auth/api";
import { prisma } from "@/lib/prisma";
import { organizationUpdateSchema } from "@/lib/validators/schemas";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await authorizeRequest(request, "organizations.manage");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = organizationUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Organization ma'lumotlari noto'g'ri." }, { status: 400 });
  }

  const current = await prisma.organization.findUnique({
    where: { id },
    include: { subscriptions: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!current) {
    return NextResponse.json({ error: "Organization topilmadi." }, { status: 404 });
  }

  const nextData: {
    name?: string;
    status?: "ACTIVE" | "BLOCKED" | "INACTIVE";
    blockReason?: string | null;
    ownerId?: string | null;
    subscriptionPlan?: "BASIC" | "PRO" | "ENTERPRISE";
    subscriptionStatus?: SubscriptionStatus;
  } = {};

  if (parsed.data.name !== undefined) nextData.name = parsed.data.name;
  if (parsed.data.status !== undefined) nextData.status = parsed.data.status;
  if (parsed.data.blockReason !== undefined) {
    nextData.blockReason = parsed.data.blockReason || null;
  }
  if (parsed.data.ownerId !== undefined) {
    nextData.ownerId = parsed.data.ownerId || null;
  }

  if (parsed.data.subscriptionPlan !== undefined) {
    const plan = await prisma.plan.findUnique({ where: { code: parsed.data.subscriptionPlan } });
    if (!plan) {
      return NextResponse.json({ error: "Plan topilmadi." }, { status: 400 });
    }
    nextData.subscriptionPlan = parsed.data.subscriptionPlan;

    if (current.subscriptions[0]) {
      await prisma.subscription.update({
        where: { id: current.subscriptions[0].id },
        data: {
          planId: plan.id,
        },
      });
    } else {
      await prisma.subscription.create({
        data: {
          organizationId: id,
          planId: plan.id,
          status: SubscriptionStatus.ACTIVE,
          startDate: new Date(),
        },
      });
    }
  }

  if (parsed.data.status === "BLOCKED" || parsed.data.status === "INACTIVE") {
    nextData.subscriptionStatus = SubscriptionStatus.EXPIRED;
  } else if (parsed.data.status === "ACTIVE" && current.subscriptionStatus === SubscriptionStatus.EXPIRED) {
    nextData.subscriptionStatus = SubscriptionStatus.ACTIVE;
  }

  const organization = await prisma.organization.update({
    where: { id },
    data: nextData,
  });

  await logSuperAdminAction({
    action: "ORGANIZATION_UPDATED",
    entityType: "ORGANIZATION",
    entityId: organization.id,
    performedById: auth.session.userId,
    payload: parsed.data,
  });

  return NextResponse.json({ organization });
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await authorizeRequest(request, "organizations.manage");
  if (!auth.ok) return auth.response;

  const { id } = await params;

  const organization = await prisma.organization.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!organization) {
    return NextResponse.json({ error: "Tashkilot topilmadi." }, { status: 404 });
  }

  await logSuperAdminAction({
    action: "ORGANIZATION_DELETED",
    entityType: "ORGANIZATION",
    entityId: organization.id,
    performedById: auth.session.userId,
    payload: { name: organization.name },
  });

  await prisma.$transaction(async (tx) => {
    const txCompat = tx as typeof tx & {
      subscription?: { deleteMany: (args: { where: { organizationId: string } }) => Promise<unknown> };
    };

    await tx.paymentReminder.deleteMany({ where: { organizationId: id } });
    await tx.telegramMessage.deleteMany({ where: { organizationId: id } });
    await tx.notification.deleteMany({ where: { organizationId: id } });
    await tx.task.deleteMany({ where: { organizationId: id } });
    await tx.auditLog.deleteMany({ where: { organizationId: id } });
    await tx.financialTransaction.deleteMany({ where: { organizationId: id } });
    await tx.salaryPayment.deleteMany({ where: { organizationId: id } });
    await tx.salaryRecord.deleteMany({ where: { organizationId: id } });
    await tx.teacherSalaryConfig.deleteMany({
      where: {
        teacher: { organizationId: id },
      },
    });
    await tx.expense.deleteMany({ where: { organizationId: id } });
    await tx.attendance.deleteMany({ where: { organizationId: id } });
    await tx.payment.deleteMany({ where: { organizationId: id } });
    await tx.studentFee.deleteMany({ where: { organizationId: id } });
    await tx.groupStudent.deleteMany({
      where: {
        group: { organizationId: id },
      },
    });
    await tx.studyGroup.deleteMany({ where: { organizationId: id } });
    await tx.lead.deleteMany({ where: { organizationId: id } });
    await tx.student.deleteMany({ where: { organizationId: id } });
    await tx.teacher.deleteMany({ where: { organizationId: id } });
    await tx.user.deleteMany({ where: { organizationId: id } });
    await tx.branch.deleteMany({ where: { organizationId: id } });

    if (txCompat.subscription) {
      await txCompat.subscription.deleteMany({ where: { organizationId: id } });
    }

    await tx.organization.delete({ where: { id } });
  });

  return NextResponse.json({ success: true });
}
