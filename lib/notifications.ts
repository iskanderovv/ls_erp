import { NotificationSeverity, NotificationType, Role, UserStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type NotificationPayload = {
  userId: string;
  organizationId?: string;
  branchId?: string | null;
  type: NotificationType;
  severity?: NotificationSeverity;
  title: string;
  message: string;
  link?: string | null;
};

export async function createNotification(payload: NotificationPayload) {
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { organizationId: true },
  });
  if (!user) {
    throw new Error("Foydalanuvchi topilmadi.");
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const existing = await prisma.notification.findFirst({
    where: {
      userId: payload.userId,
      type: payload.type,
      isRead: false,
      title: payload.title,
      link: payload.link ?? null,
      createdAt: { gte: since },
    },
    select: { id: true },
  });

  if (existing) return existing;

  return prisma.notification.create({
    data: {
      organizationId: payload.organizationId ?? user.organizationId,
      userId: payload.userId,
      branchId: payload.branchId ?? null,
      type: payload.type,
      severity: payload.severity ?? NotificationSeverity.INFO,
      title: payload.title,
      message: payload.message,
      link: payload.link ?? null,
    },
    select: { id: true },
  });
}

export async function notifyUsers(
  userIds: string[],
  payload: Omit<NotificationPayload, "userId">,
) {
  for (const userId of userIds) {
    await createNotification({
      ...payload,
      userId,
    });
  }
}

export async function notifyBranchRoles(
  branchId: string,
  roles: Role[],
  payload: Omit<NotificationPayload, "userId" | "branchId">,
) {
  const users = await prisma.user.findMany({
    where: {
      branchId,
      status: UserStatus.ACTIVE,
      role: {
        in: roles,
      },
    },
    select: { id: true },
  });

  if (!users.length) return;

  await notifyUsers(
    users.map((user) => user.id),
    {
      ...payload,
      branchId,
    },
  );
}
