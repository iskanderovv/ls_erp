import { NextRequest, NextResponse } from "next/server";

import { handleGroupCapacityAutomation } from "@/lib/automation";
import { authorizeRequest } from "@/lib/auth/api";
import { canAccessBranch } from "@/lib/auth/branch-scope";
import { prisma } from "@/lib/prisma";
import { groupStudentAttachSchema } from "@/lib/validators/schemas";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await authorizeRequest(request, "groups.manage");
  if (!auth.ok) return auth.response;

  const { id: groupId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = groupStudentAttachSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Talaba tanlash majburiy." }, { status: 400 });
  }

  const [group, student] = await Promise.all([
    prisma.studyGroup.findUnique({ where: { id: groupId } }),
    prisma.student.findUnique({ where: { id: parsed.data.studentId } }),
  ]);

  if (!group || !student) {
    return NextResponse.json({ error: "Guruh yoki talaba topilmadi." }, { status: 404 });
  }
  if (!canAccessBranch(auth.session, group.branchId)) {
    return NextResponse.json({ error: "Bu filial uchun ruxsat yo'q." }, { status: 403 });
  }

  if (group.branchId !== student.branchId) {
    return NextResponse.json(
      { error: "Talaba va guruh bir filialga tegishli bo'lishi kerak." },
      { status: 400 },
    );
  }

  const existing = await prisma.groupStudent.findUnique({
    where: {
      groupId_studentId: {
        groupId,
        studentId: parsed.data.studentId,
      },
    },
  });

  if (existing) {
    return NextResponse.json({ error: "Talaba bu guruhga allaqachon qo'shilgan." }, { status: 400 });
  }

  const relation = await prisma.groupStudent.create({
    data: {
      groupId,
      studentId: parsed.data.studentId,
    },
  });

  let automationWarning: string | null = null;
  try {
    await handleGroupCapacityAutomation(groupId);
  } catch (error) {
    automationWarning =
      error instanceof Error ? error.message : "Group capacity avtomatik tekshiruvda xatolik.";
  }

  return NextResponse.json({ relation, automationWarning });
}
