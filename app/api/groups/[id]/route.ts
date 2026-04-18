import { NextRequest, NextResponse } from "next/server";

import { handleGroupCapacityAutomation } from "@/lib/automation";
import { authorizeRequest } from "@/lib/auth/api";
import { canAccessBranch } from "@/lib/auth/branch-scope";
import { emptyToNull } from "@/lib/normalizers";
import { prisma } from "@/lib/prisma";
import { groupSchema } from "@/lib/validators/schemas";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await authorizeRequest(request, "groups.manage");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = groupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Guruh ma'lumotlari noto'g'ri." }, { status: 400 });
  }
  const existingGroup = await prisma.studyGroup.findUnique({
    where: { id },
    select: { branchId: true },
  });
  if (!existingGroup) {
    return NextResponse.json({ error: "Guruh topilmadi." }, { status: 404 });
  }
  if (
    !canAccessBranch(auth.session, existingGroup.branchId) ||
    !canAccessBranch(auth.session, parsed.data.branchId)
  ) {
    return NextResponse.json({ error: "Tanlangan filial uchun ruxsat yo'q." }, { status: 403 });
  }

  const group = await prisma.studyGroup.update({
    where: { id },
    data: {
      name: parsed.data.name,
      subject: parsed.data.subject,
      teacherId: emptyToNull(parsed.data.teacherId),
      branchId: parsed.data.branchId,
      room: emptyToNull(parsed.data.room),
      startDate: new Date(parsed.data.startDate),
      status: parsed.data.status,
      maxStudents: parsed.data.maxStudents,
      notes: emptyToNull(parsed.data.notes),
    },
  });

  let automationWarning: string | null = null;
  try {
    await handleGroupCapacityAutomation(group.id);
  } catch (error) {
    automationWarning =
      error instanceof Error ? error.message : "Group capacity avtomatik tekshiruvda xatolik.";
  }

  return NextResponse.json({ group, automationWarning });
}
