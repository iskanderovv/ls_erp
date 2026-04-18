import { NextRequest, NextResponse } from "next/server";

import { authorizeRequest } from "@/lib/auth/api";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request, "notifications.view");
  if (!auth.ok) return auth.response;

  const unreadOnly = request.nextUrl.searchParams.get("unreadOnly") === "1";
  const takeParam = Number(request.nextUrl.searchParams.get("take"));
  const take = Number.isFinite(takeParam) ? Math.min(Math.max(takeParam, 1), 50) : 20;

  const [rows, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: {
        userId: auth.session.userId,
        ...(unreadOnly ? { isRead: false } : {}),
      },
      orderBy: { createdAt: "desc" },
      take,
    }),
    prisma.notification.count({
      where: {
        userId: auth.session.userId,
        isRead: false,
      },
    }),
  ]);

  return NextResponse.json({ rows, unreadCount });
}
