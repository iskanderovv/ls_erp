import { NextRequest, NextResponse } from "next/server";

import { authorizeRequest } from "@/lib/auth/api";
import { prisma } from "@/lib/prisma";
import { notificationReadSchema } from "@/lib/validators/schemas";

export async function POST(request: NextRequest) {
  const auth = await authorizeRequest(request, "notifications.view");
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = notificationReadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Bildirishnoma parametrlari noto'g'ri." }, { status: 400 });
  }

  if (parsed.data.markAll) {
    await prisma.notification.updateMany({
      where: {
        userId: auth.session.userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
    return NextResponse.json({ success: true });
  }

  await prisma.notification.updateMany({
    where: {
      id: parsed.data.id,
      userId: auth.session.userId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return NextResponse.json({ success: true });
}
