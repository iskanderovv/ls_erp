import { NextRequest, NextResponse } from "next/server";
import { PaymentMethod } from "@prisma/client";

import { authorizeRequest } from "@/lib/auth/api";
import { canAccessBranch } from "@/lib/auth/branch-scope";
import { parseDateOnly } from "@/lib/date";
import { toCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { paymentSchema } from "@/lib/validators/schemas";

export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request, "payments.view");
  if (!auth.ok) return auth.response;

  const branchId = request.nextUrl.searchParams.get("branchId");
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  const fromDate = from ? new Date(`${from}T00:00:00.000Z`) : null;
  const toDate = to ? new Date(`${to}T23:59:59.999Z`) : null;
  const method = request.nextUrl.searchParams.get("method");
  const paymentMethod = method
    ? PaymentMethod[method as keyof typeof PaymentMethod] ?? null
    : null;

  if (branchId && !canAccessBranch(auth.session, branchId)) {
    return NextResponse.json({ error: "Bu filial uchun ruxsat yo'q." }, { status: 403 });
  }
  if (method && !paymentMethod) {
    return NextResponse.json({ error: "To'lov usuli noto'g'ri." }, { status: 400 });
  }

  const rows = await prisma.payment.findMany({
    where: {
      ...(branchId ? { branchId } : {}),
      ...(paymentMethod ? { paymentMethod } : {}),
      ...(fromDate || toDate
        ? {
            paidAt: {
              ...(fromDate ? { gte: fromDate } : {}),
              ...(toDate ? { lte: toDate } : {}),
            },
          }
        : {}),
    },
    include: {
      student: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      group: {
        select: {
          name: true,
        },
      },
      createdBy: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
    take: 300,
  });

  return NextResponse.json({ rows });
}

export async function POST(request: NextRequest) {
  const auth = await authorizeRequest(request, "payments.manage");
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = paymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "To'lov ma'lumotlari noto'g'ri." }, { status: 400 });
  }

  const student = await prisma.student.findUnique({
    where: { id: parsed.data.studentId },
    select: { id: true, branchId: true },
  });
  if (!student) {
    return NextResponse.json({ error: "Talaba topilmadi." }, { status: 404 });
  }
  if (!canAccessBranch(auth.session, student.branchId)) {
    return NextResponse.json({ error: "Bu filial uchun ruxsat yo'q." }, { status: 403 });
  }

  const groupId = parsed.data.groupId || null;
  if (groupId) {
    const group = await prisma.studyGroup.findUnique({
      where: { id: groupId },
      select: { id: true, branchId: true },
    });
    if (!group) {
      return NextResponse.json({ error: "Guruh topilmadi." }, { status: 404 });
    }
    if (group.branchId !== student.branchId) {
      return NextResponse.json(
        { error: "Talaba va guruh bir filialga tegishli bo'lishi kerak." },
        { status: 400 },
      );
    }
  }

  const payment = await prisma.$transaction(async (tx) => {
    const createdPayment = await tx.payment.create({
      data: {
        organizationId: auth.session.organizationId,
        studentId: student.id,
        groupId,
        branchId: student.branchId,
        amountCents: toCents(parsed.data.amount),
        paymentMethod: parsed.data.paymentMethod,
        paidAt: parseDateOnly(parsed.data.paidAt),
        createdById: auth.session.userId,
        note: parsed.data.note?.trim() || null,
      },
    });

    await tx.financialTransaction.create({
      data: {
        organizationId: auth.session.organizationId,
        type: "INCOME",
        amountCents: createdPayment.amountCents,
        branchId: createdPayment.branchId,
        createdById: auth.session.userId,
        occurredAt: createdPayment.paidAt,
        note: createdPayment.note,
        paymentId: createdPayment.id,
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId: auth.session.organizationId,
        action: "PAYMENT_CREATED",
        entityType: "PAYMENT",
        entityId: createdPayment.id,
        branchId: createdPayment.branchId,
        createdById: auth.session.userId,
        payload: {
          amountCents: createdPayment.amountCents,
          paymentMethod: createdPayment.paymentMethod,
        },
      },
    });

    return createdPayment;
  });

  return NextResponse.json({ payment });
}
