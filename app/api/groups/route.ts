import { NextRequest, NextResponse } from "next/server";

import { handleGroupCapacityAutomation } from "@/lib/automation";
import { authorizeRequest } from "@/lib/auth/api";
import { canAccessBranch } from "@/lib/auth/branch-scope";
import { emptyToNull } from "@/lib/normalizers";
import { prisma } from "@/lib/prisma";
import { groupSchema } from "@/lib/validators/schemas";

export async function POST(request: NextRequest) {
  const auth = await authorizeRequest(request, "groups.manage");
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = groupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Guruh ma'lumotlari noto'g'ri." }, { status: 400 });
  }
  if (!canAccessBranch(auth.session, parsed.data.branchId)) {
    return NextResponse.json({ error: "Tanlangan filial uchun ruxsat yo'q." }, { status: 403 });
  }

  const group = await prisma.studyGroup.create({
    data: {
      name: parsed.data.name,
      subject: parsed.data.subject,
      teacherId: emptyToNull(parsed.data.teacherId),
      branchId: parsed.data.branchId,
      room: emptyToNull(parsed.data.room),
      startDate: new Date(parsed.data.startDate),
      status: parsed.data.status,
      maxStudents: 20,
      notes: emptyToNull(parsed.data.notes),
    },
  });

  await handleGroupCapacityAutomation(group.id);

  return NextResponse.json({ group });
}
