import { NextRequest, NextResponse } from "next/server";

import { authorizeRequest } from "@/lib/auth/api";
import { canAccessBranch } from "@/lib/auth/branch-scope";
import { dateInputToDate, emptyToNull } from "@/lib/normalizers";
import { prisma } from "@/lib/prisma";
import { studentSchema } from "@/lib/validators/schemas";

export async function POST(request: NextRequest) {
  const auth = await authorizeRequest(request, "students.manage");
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = studentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Talaba ma'lumotlari noto'g'ri." }, { status: 400 });
  }
  if (!canAccessBranch(auth.session, parsed.data.branchId)) {
    return NextResponse.json({ error: "Tanlangan filial uchun ruxsat yo'q." }, { status: 403 });
  }

  const student = await prisma.student.create({
    data: {
      organizationId: auth.session.organizationId,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      phone: parsed.data.phone,
      parentPhone: emptyToNull(parsed.data.parentPhone),
      gender: parsed.data.gender || null,
      birthDate: dateInputToDate(parsed.data.birthDate),
      schoolName: emptyToNull(parsed.data.schoolName),
      gradeLevel: emptyToNull(parsed.data.gradeLevel),
      targetExamYear: parsed.data.targetExamYear ?? null,
      notes: emptyToNull(parsed.data.notes),
      status: parsed.data.status,
      branchId: parsed.data.branchId,
    },
  });

  return NextResponse.json({ student });
}
