import { NextRequest, NextResponse } from "next/server";

import { authorizeRequest } from "@/lib/auth/api";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request, "audit.global.view");
  if (!auth.ok) return auth.response;

  const logs = await prisma.superAdminAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      performedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
        },
      },
    },
  });

  return NextResponse.json({ logs });
}
