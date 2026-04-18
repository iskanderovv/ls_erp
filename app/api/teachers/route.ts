import { NextRequest, NextResponse } from "next/server";

import { authorizeRequest } from "@/lib/auth/api";
import { dateInputToDate, emptyToNull, splitSubjects } from "@/lib/normalizers";
import { prisma } from "@/lib/prisma";
import { teacherSchema } from "@/lib/validators/schemas";

export async function POST(request: NextRequest) {
  const auth = await authorizeRequest(request, "teachers.manage");
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = teacherSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ustoz ma'lumotlari noto'g'ri." }, { status: 400 });
  }

  const teacher = await prisma.teacher.create({
    data: {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      phone: parsed.data.phone,
      specialtySubjects: splitSubjects(parsed.data.specialtySubjects),
      branchId: parsed.data.branchId,
      status: parsed.data.status,
      hiredAt: dateInputToDate(parsed.data.hiredAt),
      notes: emptyToNull(parsed.data.notes),
    },
  });

  return NextResponse.json({ teacher });
}
