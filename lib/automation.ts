import {
  AttendanceStatus,
  LeadStatus,
  NotificationSeverity,
  NotificationType,
  Role,
  TaskEntityType,
  TaskStatus,
  StudentFeeStatus,
  UserStatus,
} from "@prisma/client";

import { monthCountInRange } from "@/lib/date";
import { feeExpectedAmount } from "@/lib/debt";
import { createNotification, notifyBranchRoles } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

const ABSENCE_ALERT_THRESHOLD = 2;
const FOLLOW_UP_DAYS = 2;
const NO_LEADS_ALERT_DAYS = 7;

export async function handleLeadCreated(leadId: string) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: {
      id: true,
      organizationId: true,
      firstName: true,
      status: true,
      branchId: true,
      assignedToId: true,
      followUpDueAt: true,
    },
  });
  if (!lead) return;

  let assignedToId = lead.assignedToId;
  if (!assignedToId) {
    const assignee = await findBranchAssignee(lead.branchId);
    if (assignee) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          assignedToId: assignee.id,
          followUpDueAt: lead.followUpDueAt ?? addDays(new Date(), FOLLOW_UP_DAYS),
        },
      });
      assignedToId = assignee.id;
    }
  }

  if (assignedToId) {
    await createNotification({
      userId: assignedToId,
      branchId: lead.branchId,
      type: NotificationType.NEW_LEAD,
      title: "Yangi lid biriktirildi",
      message: `${lead.firstName} lidingizga follow-up qiling.`,
      link: `/dashboard/leads/${lead.id}/edit`,
      severity: NotificationSeverity.INFO,
    });

      await ensureTask({
        organizationId: lead.organizationId,
        title: `${lead.firstName} bilan bog'lanish`,
        description: "Yangi lid uchun tezkor follow-up qiling.",
        assignedToId,
      branchId: lead.branchId,
      relatedEntityType: TaskEntityType.LEAD,
      relatedEntityId: lead.id,
      dueDate: addDays(new Date(), 1),
    });
  }
}

export async function handleAttendanceAutomation(
  groupId: string,
  entries: Array<{ studentId: string; status: AttendanceStatus }>,
) {
  const absentStudentIds = entries
    .filter((entry) => entry.status === AttendanceStatus.ABSENT)
    .map((entry) => entry.studentId);
  if (!absentStudentIds.length) return { alerts: 0 };

  const group = await prisma.studyGroup.findUnique({
    where: { id: groupId },
    select: { id: true, name: true, branchId: true, organizationId: true },
  });
  if (!group) return { alerts: 0 };

  let alerts = 0;
  for (const studentId of absentStudentIds) {
    const absentCount = await prisma.attendance.count({
      where: {
        studentId,
        groupId,
        status: AttendanceStatus.ABSENT,
        date: {
          gte: addDays(new Date(), -30),
        },
      },
    });

    if (absentCount < ABSENCE_ALERT_THRESHOLD) continue;

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!student) continue;

    await notifyBranchRoles(group.branchId, [Role.MANAGER, Role.ADMIN], {
      type: NotificationType.STUDENT_ABSENT,
      severity: NotificationSeverity.WARNING,
      title: "Davomat ogohlantirishi",
      message: `${student.firstName} ${student.lastName} bir necha marta dars qoldirdi.`,
      link: `/dashboard/students/${student.id}`,
    });

    const assignee = await findBranchAssignee(group.branchId);
    if (assignee) {
      await ensureTask({
        organizationId: group.organizationId,
        title: `${student.firstName} bilan bog'lanish`,
        description: `${group.name} guruhida davomat pasaydi.`,
        assignedToId: assignee.id,
        branchId: group.branchId,
        relatedEntityType: TaskEntityType.ATTENDANCE,
        relatedEntityId: student.id,
        dueDate: addDays(new Date(), 1),
      });
    }
    alerts += 1;
  }

  return { alerts };
}

export async function handleGroupCapacityAutomation(groupId: string) {
  const group = await prisma.studyGroup.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      name: true,
      branchId: true,
      maxStudents: true,
      _count: { select: { students: true } },
    },
  });
  if (!group) return;

  if (group._count.students < group.maxStudents) return;

  await notifyBranchRoles(group.branchId, [Role.ADMIN], {
    type: NotificationType.GROUP_FULL,
    severity: NotificationSeverity.WARNING,
    title: "Guruh to'ldi",
    message: `${group.name} guruhida o'rin qolmadi (${group._count.students}/${group.maxStudents}).`,
    link: `/dashboard/groups/${group.id}`,
  });
}

export async function runDailyAutomationJobs(options?: {
  runDebts?: boolean;
  runAttendance?: boolean;
  runLeads?: boolean;
  runAlerts?: boolean;
}) {
  const runDebts = options?.runDebts ?? true;
  const runAttendance = options?.runAttendance ?? true;
  const runLeads = options?.runLeads ?? true;
  const runAlerts = options?.runAlerts ?? true;

  const summary = {
    debtNotifications: 0,
    attendanceAlerts: 0,
    followUpTasks: 0,
    systemAlerts: 0,
  };

  if (runDebts) {
    const now = new Date();
    const fees = await prisma.studentFee.findMany({
      where: { status: StudentFeeStatus.ACTIVE },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        group: { select: { id: true, name: true } },
      },
    });

    for (const fee of fees) {
      const paidAgg = await prisma.payment.aggregate({
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
      const paid = paidAgg._sum.amountCents ?? 0;
      const debtCents = Math.max(0, expected - paid);
      if (debtCents <= 0) continue;

      await notifyBranchRoles(fee.branchId, [Role.MANAGER, Role.ACCOUNTANT, Role.ADMIN], {
        type: NotificationType.PAYMENT_OVERDUE,
        severity: NotificationSeverity.WARNING,
        title: "Qarz eslatmasi",
        message: `${fee.student.firstName} ${fee.student.lastName} (${fee.group.name}) to'lovi kechikkan.`,
        link: `/dashboard/debts`,
      });

      const reminderExists = await prisma.paymentReminder.findFirst({
        where: {
          studentId: fee.studentId,
          groupId: fee.groupId,
          sentAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
        select: { id: true },
      });

      if (!reminderExists) {
        const sender = await findBranchAssignee(fee.branchId);
        if (sender) {
          await prisma.paymentReminder.create({
            data: {
              organizationId: fee.organizationId,
              studentId: fee.studentId,
              groupId: fee.groupId,
              branchId: fee.branchId,
              sentById: sender.id,
              note: "Avtomatik qarz eslatmasi.",
            },
          });
        }
      }

      summary.debtNotifications += 1;
    }
  }

  if (runAttendance) {
    const recentAbsences = await prisma.attendance.findMany({
      where: {
        status: AttendanceStatus.ABSENT,
        date: { gte: addDays(new Date(), -30) },
      },
      select: {
        studentId: true,
        groupId: true,
      },
      take: 2000,
    });

    const absenceMap = new Map<string, number>();
    for (const row of recentAbsences) {
      const key = `${row.studentId}:${row.groupId}`;
      absenceMap.set(key, (absenceMap.get(key) ?? 0) + 1);
    }

    const alertPairs = Array.from(absenceMap.entries())
      .filter(([, count]) => count >= ABSENCE_ALERT_THRESHOLD)
      .map(([key]) => {
        const [studentId, groupId] = key.split(":");
        return { studentId, groupId };
      });

    for (const row of alertPairs) {
      const group = await prisma.studyGroup.findUnique({
        where: { id: row.groupId },
        select: { id: true, branchId: true, name: true },
      });
      const student = await prisma.student.findUnique({
        where: { id: row.studentId },
        select: { id: true, firstName: true, lastName: true },
      });
      if (!group || !student) continue;

      await notifyBranchRoles(group.branchId, [Role.MANAGER, Role.ADMIN], {
        type: NotificationType.ATTENDANCE_DROP,
        severity: NotificationSeverity.WARNING,
        title: "Davomat pasayishi",
        message: `${student.firstName} ${student.lastName} (${group.name}) davomatida pasayish bor.`,
        link: `/dashboard/students/${student.id}`,
      });
      summary.attendanceAlerts += 1;
    }
  }

  if (runLeads) {
    const dueLeads = await prisma.lead.findMany({
      where: {
        status: {
          in: [LeadStatus.NEW, LeadStatus.CONTACTED, LeadStatus.TRIAL_LESSON],
        },
        followUpDueAt: {
          lte: new Date(),
        },
      },
      select: {
        id: true,
        organizationId: true,
        firstName: true,
        branchId: true,
        assignedToId: true,
      },
      take: 200,
    });

    for (const lead of dueLeads) {
      const assignee =
        (lead.assignedToId
          ? await prisma.user.findUnique({
              where: { id: lead.assignedToId },
              select: { id: true, branchId: true, status: true },
            })
          : null) ?? (await findBranchAssignee(lead.branchId));

      if (!assignee || assignee.status !== UserStatus.ACTIVE || assignee.branchId !== lead.branchId) {
        continue;
      }

      await createNotification({
        userId: assignee.id,
        branchId: lead.branchId,
        type: NotificationType.LEAD_FOLLOW_UP,
        severity: NotificationSeverity.INFO,
        title: "Lid follow-up muddati",
        message: `${lead.firstName} lidiga bugun follow-up qiling.`,
        link: `/dashboard/leads/${lead.id}/edit`,
      });

      await ensureTask({
        organizationId: lead.organizationId,
        title: `${lead.firstName} lidiga follow-up`,
        description: "Avtomatik follow-up vazifasi.",
        assignedToId: assignee.id,
        branchId: lead.branchId,
        relatedEntityType: TaskEntityType.LEAD,
        relatedEntityId: lead.id,
        dueDate: addDays(new Date(), 1),
      });
      summary.followUpTasks += 1;
    }
  }

  if (runAlerts) {
    const branches = await prisma.branch.findMany({
      select: { id: true, name: true },
    });

    for (const branch of branches) {
      const since = addDays(new Date(), -NO_LEADS_ALERT_DAYS);
      const leadsCount = await prisma.lead.count({
        where: {
          branchId: branch.id,
          createdAt: { gte: since },
        },
      });

      if (leadsCount > 0) continue;

      await notifyBranchRoles(branch.id, [Role.ADMIN], {
        type: NotificationType.SYSTEM_ALERT,
        severity: NotificationSeverity.CRITICAL,
        title: "Lidlar oqimi pasaydi",
        message: `${NO_LEADS_ALERT_DAYS} kun ichida yangi lid kelmadi: ${branch.name}.`,
        link: "/dashboard/leads",
      });
      summary.systemAlerts += 1;
    }

    const dueTasks = await prisma.task.findMany({
      where: {
        status: {
          in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS],
        },
        dueDate: {
          lte: new Date(),
        },
      },
      select: {
        id: true,
        title: true,
        assignedToId: true,
        branchId: true,
      },
      take: 300,
    });

    for (const task of dueTasks) {
      await createNotification({
        userId: task.assignedToId,
        branchId: task.branchId,
        type: NotificationType.TASK_DUE,
        severity: NotificationSeverity.WARNING,
        title: "Vazifa muddati o'tmoqda",
        message: task.title,
        link: "/dashboard/tasks",
      });
    }
  }

  return summary;
}

async function findBranchAssignee(branchId: string) {
  return prisma.user.findFirst({
    where: {
      branchId,
      status: UserStatus.ACTIVE,
      role: {
        in: [Role.MANAGER, Role.ADMIN],
      },
    },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: { id: true, branchId: true, status: true },
  });
}

async function ensureTask(input: {
  organizationId: string;
  title: string;
  description?: string;
  assignedToId: string;
  branchId: string;
  relatedEntityType?: TaskEntityType;
  relatedEntityId?: string;
  dueDate?: Date;
}) {
  const existing = await prisma.task.findFirst({
    where: {
      assignedToId: input.assignedToId,
      status: {
        in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS],
      },
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId,
      title: input.title,
    },
    select: { id: true },
  });

  if (existing) return existing;

  return prisma.task.create({
    data: {
      organizationId: input.organizationId,
      title: input.title,
      description: input.description ?? null,
      assignedToId: input.assignedToId,
      branchId: input.branchId,
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId,
      dueDate: input.dueDate ?? null,
    },
    select: { id: true },
  });
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function likelyDropScore(input: {
  absentCount: number;
  lateCount: number;
  debtMonthCount: number;
}) {
  const attendanceWeight = input.absentCount * 20 + input.lateCount * 10;
  const debtWeight = input.debtMonthCount * 15;
  return Math.min(100, attendanceWeight + debtWeight);
}

export function debtMonthCount(startDate: Date, endDate: Date) {
  return Math.max(1, monthCountInRange(startDate, endDate));
}
