import { NextRequest, NextResponse } from "next/server";

import { authorizeRequest } from "@/lib/auth/api";
import { canAccessBranch } from "@/lib/auth/branch-scope";
import { prisma } from "@/lib/prisma";
import { paymentReminderSchema } from "@/lib/validators/schemas";

export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request, "reminders.view");
  if (!auth.ok) return auth.response;

  const branchId = request.nextUrl.searchParams.get("branchId");
  const studentId = request.nextUrl.searchParams.get("studentId");

  if (branchId && !canAccessBranch(auth.session, branchId)) {
    return NextResponse.json({ error: "Bu filial uchun ruxsat yo'q." }, { status: 403 });
  }

  const rows = await prisma.paymentReminder.findMany({
    where: {
      ...(branchId ? { branchId } : {}),
      ...(studentId ? { studentId } : {}),
    },
    include: {
      student: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      group: {
        select: {
          name: true,
        },
      },
      sentBy: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: { sentAt: "desc" },
    take: 200,
  });

  const scopedRows = rows.filter((row) => canAccessBranch(auth.session, row.branchId));
  return NextResponse.json({ rows: scopedRows });
}

export async function POST(request: NextRequest) {
  const auth = await authorizeRequest(request, "reminders.manage");
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = paymentReminderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Eslatma ma'lumotlari noto'g'ri." }, { status: 400 });
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

  const groupId = parsed.data.groupId || null;
  if (groupId) {
    const group = await prisma.studyGroup.findUnique({
      where: { id: groupId },
      select: { id: true, branchId: true },
    });
    if (!group) {
      return NextResponse.json({ error: "Guruh topilmadi." }, { status: 404 });
    }
    if (group.branchId !== student.branchId) {
      return NextResponse.json({ error: "Talaba va guruh filiallari mos emas." }, { status: 400 });
    }
  }

  const reminder = await prisma.paymentReminder.create({
    data: {
      organizationId: auth.session.organizationId,
      studentId: student.id,
      groupId,
      branchId: student.branchId,
      note: parsed.data.note?.trim() || null,
      sentById: auth.session.userId,
    },
  });

  return NextResponse.json({ reminder });
}
