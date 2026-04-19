import { NextRequest, NextResponse } from "next/server";

import { authorizeRequest } from "@/lib/auth/api";
import { canAccessBranch } from "@/lib/auth/branch-scope";
import { parseDateOnly } from "@/lib/date";
import { toCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { salaryPaymentSchema } from "@/lib/validators/schemas";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await authorizeRequest(request, "salary.manage");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = salaryPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "To'lov ma'lumotlari noto'g'ri." }, { status: 400 });
  }

  const salaryRecord = await prisma.salaryRecord.findUnique({
    where: { id },
    select: {
      id: true,
      teacherId: true,
      branchId: true,
      calculatedAmountCents: true,
      paidAmountCents: true,
      status: true,
    },
  });
  if (!salaryRecord) {
    return NextResponse.json({ error: "Oylik yozuvi topilmadi." }, { status: 404 });
  }
  if (!canAccessBranch(auth.session, salaryRecord.branchId)) {
    return NextResponse.json({ error: "Bu filial uchun ruxsat yo'q." }, { status: 403 });
  }

  const amountCents = toCents(parsed.data.amount);
  const remaining = salaryRecord.calculatedAmountCents - salaryRecord.paidAmountCents;
  if (amountCents > remaining) {
    return NextResponse.json({ error: "To'lov summasi qolgan qarzdan katta." }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.salaryPayment.create({
      data: {
        organizationId: auth.session.organizationId,
        salaryRecordId: salaryRecord.id,
        teacherId: salaryRecord.teacherId,
        branchId: salaryRecord.branchId,
        amountCents,
        paidAt: parseDateOnly(parsed.data.paidAt),
        createdById: auth.session.userId,
        note: parsed.data.note?.trim() || null,
      },
    });

    const updated = await tx.salaryRecord.update({
      where: { id: salaryRecord.id },
      data: {
        paidAmountCents: {
          increment: amountCents,
        },
      },
      select: {
        id: true,
        calculatedAmountCents: true,
        paidAmountCents: true,
      },
    });

    const nextStatus =
      updated.paidAmountCents >= updated.calculatedAmountCents
        ? "PAID"
        : updated.paidAmountCents > 0
          ? "PARTIAL"
          : "PENDING";

    await tx.salaryRecord.update({
      where: { id: salaryRecord.id },
      data: {
        status: nextStatus,
      },
    });

    await tx.financialTransaction.create({
      data: {
        organizationId: auth.session.organizationId,
        type: "SALARY",
        amountCents,
        branchId: salaryRecord.branchId,
        createdById: auth.session.userId,
        occurredAt: payment.paidAt,
        note: payment.note,
        salaryPaymentId: payment.id,
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId: auth.session.organizationId,
        action: "SALARY_PAID",
        entityType: "SALARY_PAYMENT",
        entityId: payment.id,
        branchId: salaryRecord.branchId,
        createdById: auth.session.userId,
        payload: {
          salaryRecordId: salaryRecord.id,
          amountCents,
          nextStatus,
        },
      },
    });

    return {
      payment,
      status: nextStatus,
    };
  });

  return NextResponse.json(result);
}
