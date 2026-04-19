import { NextRequest, NextResponse } from "next/server";
import { OrganizationStatus } from "@prisma/client";

import { canAccessSystem, INACTIVE_SUBSCRIPTION_MESSAGE } from "@/lib/auth/access";
import { hasPermission, type Permission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { SESSION_NAME, verifySessionToken } from "@/lib/auth/token";

type AuthResult =
  | {
      ok: true;
      session: NonNullable<Awaited<ReturnType<typeof verifySessionToken>>>;
    }
  | {
      ok: false;
      response: NextResponse<{ error: string }>;
    };

export async function authorizeRequest(
  request: NextRequest,
  permission?: Permission,
): Promise<AuthResult> {
  const token = request.cookies.get(SESSION_NAME)?.value;
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Avtorizatsiya talab qilinadi." }, { status: 401 }),
    };
  }

  const session = await verifySessionToken(token);
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Sessiya muddati tugagan." }, { status: 401 }),
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      status: true,
      role: true,
      organization: {
        select: {
          subscriptionStatus: true,
        },
      },
    },
  });

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Foydalanuvchi topilmadi." }, { status: 401 }),
    };
  }

  if (
    !canAccessSystem({
      role: user.role,
      userStatus: user.status,
      organizationStatus: OrganizationStatus.ACTIVE,
      subscriptionStatus: user.organization.subscriptionStatus,
    })
  ) {
    return {
      ok: false,
      response: NextResponse.json({ error: INACTIVE_SUBSCRIPTION_MESSAGE }, { status: 403 }),
    };
  }

  if (permission && !hasPermission(session.role, permission)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Bu amal uchun ruxsat yo'q." }, { status: 403 }),
    };
  }

  return { ok: true, session };
}
