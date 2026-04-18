import { NextRequest, NextResponse } from "next/server";

import { handleAttendanceAutomation } from "@/lib/automation";
import { authorizeRequest } from "@/lib/auth/api";
import { canAccessBranch } from "@/lib/auth/branch-scope";
import { parseDateOnly } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { attendanceSaveSchema } from "@/lib/validators/schemas";

export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request, "attendance.view");
  if (!auth.ok) return auth.response;

  const groupId = request.nextUrl.searchParams.get("groupId");
  const studentId = request.nextUrl.searchParams.get("studentId");
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");

  const where = {
    ...(groupId ? { groupId } : {}),
    ...(studentId ? { studentId } : {}),
    ...(from || to
      ? {
          date: {
            ...(from ? { gte: parseDateOnly(from) } : {}),
            ...(to ? { lte: parseDateOnly(to) } : {}),
          },
        }
      : {}),
  };

  const rows = await prisma.attendance.findMany({
    where,
    include: {
      student: {
        select: {
          firstName: true,
          lastName: true,
          branchId: true,
        },
      },
      group: {
        select: {
          name: true,
          branchId: true,
        },
      },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 300,
  });

  const scopedRows = rows.filter((row) => canAccessBranch(auth.session, row.group.branchId));
  return NextResponse.json({ rows: scopedRows });
}

export async function POST(request: NextRequest) {
  const auth = await authorizeRequest(request, "attendance.manage");
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = attendanceSaveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Davomat ma'lumotlari noto'g'ri." }, { status: 400 });
  }

  const group = await prisma.studyGroup.findUnique({
    where: { id: parsed.data.groupId },
    include: {
      students: {
        select: {
          studentId: true,
        },
      },
    },
  });

  if (!group) {
    return NextResponse.json({ error: "Guruh topilmadi." }, { status: 404 });
  }
  if (!canAccessBranch(auth.session, group.branchId)) {
    return NextResponse.json({ error: "Bu filial uchun ruxsat yo'q." }, { status: 403 });
  }

  const validStudentIds = new Set(group.students.map((item) => item.studentId));
  const hasInvalidEntry = parsed.data.entries.some((entry) => !validStudentIds.has(entry.studentId));
  if (hasInvalidEntry) {
    return NextResponse.json({ error: "Noto'g'ri talaba tanlangan." }, { status: 400 });
  }

  const targetDate = parseDateOnly(parsed.data.date);

  await prisma.$transaction(
    parsed.data.entries.map((entry) =>
      prisma.attendance.upsert({
        where: {
          studentId_groupId_date: {
            studentId: entry.studentId,
            groupId: parsed.data.groupId,
            date: targetDate,
          },
        },
        create: {
          studentId: entry.studentId,
          groupId: parsed.data.groupId,
          date: targetDate,
          status: entry.status,
          note: entry.note?.trim() || null,
        },
        update: {
          status: entry.status,
          note: entry.note?.trim() || null,
        },
      }),
    ),
  );

  let automationWarning: string | null = null;
  try {
    await handleAttendanceAutomation(
      parsed.data.groupId,
      parsed.data.entries.map((entry) => ({
        studentId: entry.studentId,
        status: entry.status,
      })),
    );
  } catch (error) {
    automationWarning =
      error instanceof Error ? error.message : "Davomat avtomatik qoidalarida xatolik yuz berdi.";
  }

  return NextResponse.json({ success: true, automationWarning });
}
