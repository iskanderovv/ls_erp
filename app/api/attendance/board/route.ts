import { NextRequest, NextResponse } from "next/server";

import { authorizeRequest } from "@/lib/auth/api";
import { canAccessBranch } from "@/lib/auth/branch-scope";
import { parseDateOnly } from "@/lib/date";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request, "attendance.view");
  if (!auth.ok) return auth.response;

  const groupId = request.nextUrl.searchParams.get("groupId");
  const date = request.nextUrl.searchParams.get("date");

  if (!groupId || !date) {
    return NextResponse.json({ error: "Guruh va sana majburiy." }, { status: 400 });
  }

  const targetDate = parseDateOnly(date);
  const group = await prisma.studyGroup.findUnique({
    where: { id: groupId },
    include: {
      students: {
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
        },
        orderBy: {
          student: {
            firstName: "asc",
          },
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

  const attendanceRows = await prisma.attendance.findMany({
    where: {
      groupId,
      date: targetDate,
    },
    select: {
      studentId: true,
      status: true,
      note: true,
    },
  });

  const attendanceMap = new Map(attendanceRows.map((row) => [row.studentId, row]));
  const students = group.students.map((groupStudent) => {
    const attendance = attendanceMap.get(groupStudent.studentId);
    return {
      ...groupStudent.student,
      status: attendance?.status ?? "PRESENT",
      note: attendance?.note ?? "",
    };
  });

  return NextResponse.json({
    group: {
      id: group.id,
      name: group.name,
      branchId: group.branchId,
    },
    date,
    students,
  });
}
