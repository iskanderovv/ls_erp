import { NextRequest, NextResponse } from "next/server";

import { authorizeRequest } from "@/lib/auth/api";
import { canAccessBranch } from "@/lib/auth/branch-scope";
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
  if (!canAccessBranch(auth.session, parsed.data.branchId)) {
    return NextResponse.json({ error: "Tanlangan filial uchun ruxsat yo'q." }, { status: 403 });
  }

  const teacher = await prisma.teacher.create({
    data: {
      organizationId: auth.session.organizationId,
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
