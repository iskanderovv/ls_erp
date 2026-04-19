import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

type AuditInput = {
  action: string;
  entityType: string;
  entityId?: string | null;
  performedById: string;
  payload?: unknown;
};

export async function logSuperAdminAction(input: AuditInput) {
  await prisma.superAdminAuditLog.create({
    data: {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      performedById: input.performedById,
      payload: (input.payload ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}
