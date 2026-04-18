import { AttendanceBoard } from "@/components/attendance/attendance-board";
import { PageHeader } from "@/components/shared/page-header";
import { requirePagePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function AttendancePage() {
  const session = await requirePagePermission("attendance.view");
  const isGlobalRole = session.role === "SUPER_ADMIN" || session.role === "ADMIN";

  let groups: Array<{ id: string; name: string }> = [];
  if (session.role === "TEACHER") {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { phone: true, branchId: true },
    });
    const teacher = user
      ? await prisma.teacher.findFirst({
          where: {
            phone: user.phone,
            ...(user.branchId ? { branchId: user.branchId } : {}),
          },
          select: { id: true, branchId: true },
        })
      : null;

    groups = await prisma.studyGroup.findMany({
      where: teacher
        ? {
            teacherId: teacher.id,
            ...(teacher.branchId ? { branchId: teacher.branchId } : {}),
          }
        : { id: "__none__" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  } else {
    groups = await prisma.studyGroup.findMany({
      where: isGlobalRole ? undefined : { branchId: session.branchId ?? "__none__" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  }

  return (
    <div>
      <PageHeader
        title="Davomat"
        description="Guruh bo'yicha kunlik davomatni tez belgilash"
      />
      <AttendanceBoard groups={groups} />
    </div>
  );
}
