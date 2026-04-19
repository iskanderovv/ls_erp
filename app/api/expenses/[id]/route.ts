import { NextRequest, NextResponse } from "next/server";

import { authorizeRequest } from "@/lib/auth/api";
import { canAccessBranch } from "@/lib/auth/branch-scope";
import { parseDateOnly } from "@/lib/date";
import { toCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { expenseSchema } from "@/lib/validators/schemas";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await authorizeRequest(request, "expenses.manage");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = expenseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Xarajat ma'lumotlari noto'g'ri." }, { status: 400 });
  }
  if (!canAccessBranch(auth.session, parsed.data.branchId)) {
    return NextResponse.json({ error: "Bu filial uchun ruxsat yo'q." }, { status: 403 });
  }

  const existing = await prisma.expense.findUnique({
    where: { id },
    select: { id: true, branchId: true, amountCents: true, paidAt: true, title: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Xarajat topilmadi." }, { status: 404 });
  }
  if (!canAccessBranch(auth.session, existing.branchId)) {
    return NextResponse.json({ error: "Bu filial uchun ruxsat yo'q." }, { status: 403 });
  }

  const updatedExpense = await prisma.$transaction(async (tx) => {
    const nextExpense = await tx.expense.update({
      where: { id },
      data: {
        title: parsed.data.title,
        amountCents: toCents(parsed.data.amount),
        category: parsed.data.category,
        branchId: parsed.data.branchId,
        paidAt: parseDateOnly(parsed.data.paidAt),
        note: parsed.data.note?.trim() || null,
      },
    });

    await tx.financialTransaction.updateMany({
      where: {
        expenseId: id,
      },
      data: {
        amountCents: nextExpense.amountCents,
        branchId: nextExpense.branchId,
        occurredAt: nextExpense.paidAt,
        note: nextExpense.note ?? nextExpense.title,
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId: auth.session.organizationId,
        action: "EXPENSE_UPDATED",
        entityType: "EXPENSE",
        entityId: nextExpense.id,
        branchId: nextExpense.branchId,
        createdById: auth.session.userId,
        payload: {
          previousAmountCents: existing.amountCents,
          nextAmountCents: nextExpense.amountCents,
        },
      },
    });

    return nextExpense;
  });

  return NextResponse.json({ expense: updatedExpense });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await authorizeRequest(request, "expenses.manage");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const existing = await prisma.expense.findUnique({
    where: { id },
    select: { id: true, branchId: true, status: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Xarajat topilmadi." }, { status: 404 });
  }
  if (!canAccessBranch(auth.session, existing.branchId)) {
    return NextResponse.json({ error: "Bu filial uchun ruxsat yo'q." }, { status: 403 });
  }

  if (existing.status === "VOID") {
    return NextResponse.json({ success: true });
  }

  await prisma.$transaction(async (tx) => {
    await tx.expense.update({
      where: { id },
      data: { status: "VOID" },
    });

    await tx.auditLog.create({
      data: {
        organizationId: auth.session.organizationId,
        action: "EXPENSE_VOIDED",
        entityType: "EXPENSE",
        entityId: id,
        branchId: existing.branchId,
        createdById: auth.session.userId,
      },
    });
  });

  return NextResponse.json({ success: true });
}
