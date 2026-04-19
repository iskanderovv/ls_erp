import { NextRequest, NextResponse } from "next/server";

import { logSuperAdminAction } from "@/lib/admin/audit";
import { authorizeRequest } from "@/lib/auth/api";
import { prisma } from "@/lib/prisma";
import { ownerStatusUpdateSchema } from "@/lib/validators/schemas";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await authorizeRequest(request, "users.global.manage");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = ownerStatusUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Foydalanuvchi holati noto'g'ri." }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id },
    data: { status: parsed.data.status },
  });

  await logSuperAdminAction({
    action: "USER_STATUS_UPDATED",
    entityType: "USER",
    entityId: user.id,
    performedById: auth.session.userId,
    payload: { status: user.status },
  });

  return NextResponse.json({ user });
}
