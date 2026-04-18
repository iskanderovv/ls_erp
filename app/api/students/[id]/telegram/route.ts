import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { authorizeRequest } from "@/lib/auth/api";
import { canAccessBranch } from "@/lib/auth/branch-scope";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  telegramChatId: z.string().trim().optional().or(z.literal("")),
  telegramOptIn: z.boolean(),
  parentTelegramChatId: z.string().trim().optional().or(z.literal("")),
  parentTelegramOptIn: z.boolean(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await authorizeRequest(request, "students.manage");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Telegram sozlamalari noto'g'ri." }, { status: 400 });
  }

  const student = await prisma.student.findUnique({
    where: { id },
    select: { id: true, branchId: true },
  });
  if (!student) {
    return NextResponse.json({ error: "Talaba topilmadi." }, { status: 404 });
  }
  if (!canAccessBranch(auth.session, student.branchId)) {
    return NextResponse.json({ error: "Bu filial uchun ruxsat yo'q." }, { status: 403 });
  }

  const updated = await prisma.student.update({
    where: { id: student.id },
    data: {
      telegramChatId: parsed.data.telegramChatId?.trim() || null,
      telegramOptIn: parsed.data.telegramOptIn,
      parentTelegramChatId: parsed.data.parentTelegramChatId?.trim() || null,
      parentTelegramOptIn: parsed.data.parentTelegramOptIn,
    },
    select: {
      id: true,
      telegramChatId: true,
      telegramOptIn: true,
      parentTelegramChatId: true,
      parentTelegramOptIn: true,
    },
  });

  return NextResponse.json({ student: updated });
}
