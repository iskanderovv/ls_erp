import { AttendanceStatus, LeadStatus, StudentFeeStatus, StudentStatus, TaskStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { authorizeRequest } from "@/lib/auth/api";
import { debtMonthCount, likelyDropScore } from "@/lib/automation";
import { hasPermission } from "@/lib/auth/permissions";
import { feeExpectedAmount } from "@/lib/debt";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request, "dashboard.view");
  if (!auth.ok) return auth.response;

  const branchId =
    auth.session.role === "SUPER_ADMIN" || auth.session.role === "ADMIN"
      ? null
      : (auth.session.branchId ?? "__none__");
  const branchFilter = branchId ? { branchId } : {};

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const monthAgo = new Date(now);
  monthAgo.setDate(monthAgo.getDate() - 30);
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [inactiveStudents, followUpLeads, newLeadsLast30, convertedLeadsLast30, myTasks] =
    await Promise.all([
      prisma.student.count({
        where: {
          ...branchFilter,
          status: {
            in: [StudentStatus.INACTIVE, StudentStatus.ARCHIVED],
          },
        },
      }),
      prisma.lead.count({
        where: {
          ...branchFilter,
          status: {
            in: [LeadStatus.NEW, LeadStatus.CONTACTED, LeadStatus.TRIAL_LESSON],
          },
          followUpDueAt: {
            lte: now,
          },
        },
      }),
      prisma.lead.count({
        where: {
          ...branchFilter,
          createdAt: { gte: monthAgo },
        },
      }),
      prisma.lead.count({
        where: {
          ...branchFilter,
          status: LeadStatus.CONVERTED,
          updatedAt: { gte: monthAgo },
        },
      }),
      prisma.task.findMany({
        where: {
          assignedToId: auth.session.userId,
          status: {
            in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS],
          },
        },
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
        take: 5,
        select: {
          id: true,
          title: true,
          dueDate: true,
          status: true,
        },
      }),
    ]);

  const absentToday = await prisma.attendance.count({
    where: {
      group: branchFilter,
      status: AttendanceStatus.ABSENT,
      date: {
        gte: todayStart,
        lte: now,
      },
    },
  });

  const activeFees = await prisma.studentFee.findMany({
    where: {
      status: StudentFeeStatus.ACTIVE,
      ...branchFilter,
    },
    include: {
      student: {
        select: { id: true, firstName: true, lastName: true },
      },
      group: {
        select: { id: true, name: true },
      },
    },
  });

  const overdueRows: Array<{
    studentId: string;
    studentName: string;
    groupName: string;
    debtCents: number;
    monthCount: number;
  }> = [];

  for (const fee of activeFees) {
    const paid = await prisma.payment.aggregate({
      where: {
        studentId: fee.studentId,
        groupId: fee.groupId,
        paidAt: {
          gte: fee.startDate,
          lte: fee.endDate ?? now,
        },
      },
      _sum: { amountCents: true },
    });
    const expected = feeExpectedAmount(fee, now);
    const paidCents = paid._sum.amountCents ?? 0;
    const debtCents = Math.max(0, expected - paidCents);
    if (debtCents <= 0) continue;

    overdueRows.push({
      studentId: fee.studentId,
      studentName: `${fee.student.firstName} ${fee.student.lastName}`,
      groupName: fee.group.name,
      debtCents,
      monthCount: debtMonthCount(fee.startDate, fee.endDate ?? now),
    });
  }

  const absencesByStudent = await prisma.attendance.groupBy({
    by: ["studentId"],
    where: {
      group: branchFilter,
      date: { gte: monthAgo },
      status: AttendanceStatus.ABSENT,
    },
    _count: { _all: true },
  });
  const lateByStudent = await prisma.attendance.groupBy({
    by: ["studentId"],
    where: {
      group: branchFilter,
      date: { gte: monthAgo },
      status: AttendanceStatus.LATE,
    },
    _count: { _all: true },
  });
  const absentMap = new Map(absencesByStudent.map((row) => [row.studentId, row._count._all]));
  const lateMap = new Map(lateByStudent.map((row) => [row.studentId, row._count._all]));

  const scored = overdueRows.map((row) => ({
    studentId: row.studentId,
    studentName: row.studentName,
    score: likelyDropScore({
      absentCount: absentMap.get(row.studentId) ?? 0,
      lateCount: lateMap.get(row.studentId) ?? 0,
      debtMonthCount: row.monthCount,
    }),
    debtCents: row.debtCents,
  }));
  scored.sort((a, b) => b.score - a.score);

  const noNewLeads = await prisma.lead.count({
    where: {
      ...branchFilter,
      createdAt: { gte: weekAgo },
    },
  });

  const alerts: Array<{
    id: string;
    severity: "INFO" | "WARNING" | "CRITICAL";
    title: string;
    message: string;
    link: string;
  }> = [];

  if (overdueRows.length) {
    alerts.push({
      id: "overdue-payments",
      severity: "WARNING",
      title: "Qarzdor talabalar bor",
      message: `${overdueRows.length} ta talabaning to'lovi kechikkan.`,
      link: "/dashboard/debts",
    });
  }
  if (absentToday > 0) {
    alerts.push({
      id: "absent-today",
      severity: "WARNING",
      title: "Bugungi davomatda muammo",
      message: `${absentToday} ta ABSENT qayd etildi.`,
      link: "/dashboard/attendance",
    });
  }
  if (noNewLeads === 0) {
    alerts.push({
      id: "no-leads-week",
      severity: "CRITICAL",
      title: "Yangi lidlar yo'q",
      message: "So'nggi 7 kunda yangi lid qo'shilmagan.",
      link: "/dashboard/leads",
    });
  }

  const dueToday = myTasks.filter(
    (task) =>
      task.dueDate &&
      task.dueDate.toISOString().slice(0, 10) <= now.toISOString().slice(0, 10),
  ).length;

  return NextResponse.json({
    reminders: {
      overdueStudents: hasPermission(auth.session.role, "debts.view") ? overdueRows.length : null,
      absentToday,
      followUpLeads,
      inactiveStudents,
    },
    leadConversionRate: newLeadsLast30
      ? Math.round((convertedLeadsLast30 / newLeadsLast30) * 100)
      : 0,
    predictions: {
      likelyDropouts: scored.slice(0, 5),
    },
    alerts,
    myTasks: {
      openCount: myTasks.length,
      dueToday,
      rows: myTasks,
    },
    overduePreview: overdueRows
      .sort((a, b) => b.debtCents - a.debtCents)
      .slice(0, 5)
      .map((row) => ({
        studentId: row.studentId,
        studentName: row.studentName,
        groupName: row.groupName,
        debtCents: row.debtCents,
      })),
  });
}
