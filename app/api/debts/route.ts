import { NextRequest, NextResponse } from "next/server";
import { StudentFeeStatus } from "@prisma/client";

import { authorizeRequest } from "@/lib/auth/api";
import { canAccessBranch } from "@/lib/auth/branch-scope";
import { feeExpectedAmount } from "@/lib/debt";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request, "debts.view");
  if (!auth.ok) return auth.response;

  const branchId = request.nextUrl.searchParams.get("branchId");
  const groupId = request.nextUrl.searchParams.get("groupId");

  if (branchId && !canAccessBranch(auth.session, branchId)) {
    return NextResponse.json({ error: "Bu filial uchun ruxsat yo'q." }, { status: 403 });
  }

  const fees = await prisma.studentFee.findMany({
    where: {
      status: StudentFeeStatus.ACTIVE,
      ...(branchId ? { branchId } : {}),
      ...(groupId ? { groupId } : {}),
    },
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          branchId: true,
        },
      },
      group: {
        select: {
          id: true,
          name: true,
        },
      },
      branch: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const scopedFees = fees.filter((fee) => canAccessBranch(auth.session, fee.branchId));
  const now = new Date();

  const rows = await Promise.all(
    scopedFees.map(async (fee) => {
      const paidAggregate = await prisma.payment.aggregate({
        where: {
          studentId: fee.studentId,
          groupId: fee.groupId,
          paidAt: {
            gte: fee.startDate,
            lte: fee.endDate ?? now,
          },
        },
        _sum: {
          amountCents: true,
        },
      });

      const reminderCount = await prisma.paymentReminder.count({
        where: {
          studentId: fee.studentId,
          groupId: fee.groupId,
        },
      });

      const expectedCents = feeExpectedAmount(fee, now);
      const paidCents = paidAggregate._sum.amountCents ?? 0;
      const debtCents = Math.max(0, expectedCents - paidCents);

      return {
        feeId: fee.id,
        studentId: fee.studentId,
        groupId: fee.groupId,
        branchId: fee.branchId,
        studentName: `${fee.student.firstName} ${fee.student.lastName}`,
        studentPhone: fee.student.phone,
        groupName: fee.group.name,
        branchName: fee.branch.name,
        monthlyFeeCents: fee.monthlyFeeCents,
        expectedCents,
        paidCents,
        debtCents,
        reminderCount,
      };
    }),
  );

  rows.sort((a, b) => b.debtCents - a.debtCents);

  return NextResponse.json({ rows });
}
