import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { OrganizationStatus } from "@prisma/client";

import { canAccessSystem } from "@/lib/auth/access";
import { hasPermission, type Permission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { SESSION_NAME, verifySessionToken } from "@/lib/auth/token";

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_NAME)?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session) return null;

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

  if (!user) return null;

  if (
    !canAccessSystem({
      role: user.role,
      userStatus: user.status,
      organizationStatus: OrganizationStatus.ACTIVE,
      subscriptionStatus: user.organization.subscriptionStatus,
    })
  ) {
    return null;
  }

  return session;
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export async function requirePagePermission(permission: Permission) {
  const session = await requireSession();
  if (!hasPermission(session.role, permission)) {
    redirect("/dashboard");
  }
  return session;
}
