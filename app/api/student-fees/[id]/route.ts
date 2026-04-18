import { NextRequest, NextResponse } from "next/server";

import { authorizeRequest } from "@/lib/auth/api";
import { canAccessBranch } from "@/lib/auth/branch-scope";
import { parseDateOnly } from "@/lib/date";
import { toCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { studentFeeSchema } from "@/lib/validators/schemas";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await authorizeRequest(request, "payments.manage");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = studentFeeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Oylik to'lov ma'lumotlari noto'g'ri." }, { status: 400 });
  }

  const existing = await prisma.studentFee.findUnique({
    where: { id },
    select: { id: true, branchId: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Oylik to'lov topilmadi." }, { status: 404 });
  }
  if (!canAccessBranch(auth.session, existing.branchId)) {
    return NextResponse.json({ error: "Bu filial uchun ruxsat yo'q." }, { status: 403 });
  }

  const [student, group] = await Promise.all([
    prisma.student.findUnique({
      where: { id: parsed.data.studentId },
      select: { id: true, branchId: true },
    }),
    prisma.studyGroup.findUnique({
      where: { id: parsed.data.groupId },
      select: { id: true, branchId: true },
    }),
  ]);

  if (!student || !group) {
    return NextResponse.json({ error: "Talaba yoki guruh topilmadi." }, { status: 404 });
  }
  if (student.branchId !== group.branchId) {
    return NextResponse.json({ error: "Talaba va guruh filiallari mos emas." }, { status: 400 });
  }
  if (!canAccessBranch(auth.session, student.branchId)) {
    return NextResponse.json({ error: "Bu filial uchun ruxsat yo'q." }, { status: 403 });
  }

  const startDate = parseDateOnly(parsed.data.startDate);
  const endDate = parsed.data.endDate ? parseDateOnly(parsed.data.endDate) : null;
  if (endDate && endDate < startDate) {
    return NextResponse.json(
      { error: "Tugash sanasi boshlanish sanasidan oldin bo'lishi mumkin emas." },
      { status: 400 },
    );
  }

  const fee = await prisma.studentFee.update({
    where: { id },
    data: {
      studentId: student.id,
      groupId: group.id,
      branchId: student.branchId,
      monthlyFeeCents: toCents(parsed.data.monthlyFee),
      startDate,
      endDate,
      status: parsed.data.status,
    },
  });

  return NextResponse.json({ fee });
}
