import { NextRequest, NextResponse } from "next/server";

import { authorizeRequest } from "@/lib/auth/api";
import { canAccessBranch } from "@/lib/auth/branch-scope";
import { prisma } from "@/lib/prisma";
import { sendStudentTelegram } from "@/lib/telegram";
import { telegramSendSchema } from "@/lib/validators/schemas";

export async function POST(request: NextRequest) {
  const auth = await authorizeRequest(request, "telegram.manage");
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = telegramSendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Telegram yuborish ma'lumotlari noto'g'ri." }, { status: 400 });
  }

  const student = await prisma.student.findUnique({
    where: { id: parsed.data.studentId },
    select: { id: true, branchId: true },
  });
  if (!student) {
    return NextResponse.json({ error: "Talaba topilmadi." }, { status: 404 });
  }
  if (!canAccessBranch(auth.session, student.branchId)) {
    return NextResponse.json({ error: "Bu filial uchun ruxsat yo'q." }, { status: 403 });
  }

  const result = await sendStudentTelegram({
    studentId: student.id,
    recipient: parsed.data.recipient,
    type: parsed.data.type,
    createdById: auth.session.userId,
    note: parsed.data.note?.trim() || null,
  });

  return NextResponse.json(result);
}
